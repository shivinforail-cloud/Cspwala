importScripts('cloud-sync.js');

const VERSION = '0.2.0';
const SYNC_ALARM = 'cspwala-shadow-cloud-sync';

const DEFAULTS = {
  observing: false,
  sessionId: null,
  sessionStartedAt: null,
  segmentId: null,
  segmentStartedAt: null,
  lastEventAt: null,
  deviceId: null,
  deviceName: '',
  events: [],
  workflows: [],
  customerContexts: {},
  syncQueue: [],
  cloudConfig: { projectId: '', apiKey: '' },
  cloudAuth: null,
  cloudStatus: {
    connected: false,
    lastSyncedAt: null,
    lastError: null,
    pending: 0,
    deviceCount: 0
  },
  settings: {
    captureScreenshots: false,
    maxEvents: 8000,
    captureCustomerDetails: true,
    maskCustomerDetailsInDashboard: true,
    autoSegmentMinutes: 10,
    learnOnSuccess: true
  }
};

const NEVER_STORE_HINTS = [
  'password', 'passcode', 'login password', 'otp', 'one time password', 'cvv', 'cvc',
  'transaction pin', 'upi pin', 'mpin', 'atm pin', 'biometric', 'fingerprint', 'iris'
];

const CUSTOMER_PII_HINTS = [
  'aadhaar', 'aadhar', 'pan', 'account', 'ifsc', 'mobile', 'phone', 'email', 'dob',
  'birth', 'address', 'name', 'income', 'survey', 'gat', 'ration', 'farmer'
];

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function hashString(value = '') {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function nestedMerge(defaultValue, storedValue) {
  return { ...defaultValue, ...(storedValue || {}) };
}

async function getState() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return {
    ...DEFAULTS,
    ...stored,
    settings: nestedMerge(DEFAULTS.settings, stored.settings),
    cloudConfig: nestedMerge(DEFAULTS.cloudConfig, stored.cloudConfig),
    cloudStatus: nestedMerge(DEFAULTS.cloudStatus, stored.cloudStatus),
    customerContexts: stored.customerContexts || {},
    syncQueue: stored.syncQueue || []
  };
}

async function setState(patch) {
  await chrome.storage.local.set(patch);
}

function eventDescriptor(event) {
  return [event.name, event.label, event.placeholder, event.selector, event.inputType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isNeverStoreField(event) {
  if (event.inputType === 'password') return true;
  const text = eventDescriptor(event);
  return NEVER_STORE_HINTS.some((hint) => text.includes(hint));
}

function isCustomerPiiField(event) {
  const text = eventDescriptor(event);
  return CUSTOMER_PII_HINTS.some((hint) => text.includes(hint));
}

function valueMarker(event) {
  const value = String(event.value ?? '');
  if (/^\[\d+ file\(s\)\]$/.test(value)) return value;
  if (value === '[CHECKED]' || value === '[UNCHECKED]') return value;
  if (!value) return '[EMPTY]';
  return '[VALUE_CAPTURED]';
}

function sanitizeEvent(rawEvent) {
  const clean = { ...rawEvent };
  if (['input', 'change'].includes(clean.type) && 'value' in clean) {
    if (isNeverStoreField(clean)) {
      clean.value = '[NEVER_STORED]';
      clean.secret = true;
    } else {
      clean.value = valueMarker(clean);
      clean.customerDataCaptured = true;
      clean.sensitive = isCustomerPiiField(clean);
    }
  }
  return clean;
}

function fieldKey(event) {
  return `field_${hashString([event.name, event.label, event.selector, event.inputType].filter(Boolean).join('|'))}`;
}

function customerFieldFromEvent(event, settings) {
  if (!settings.captureCustomerDetails) return null;
  if (!['input', 'change'].includes(event.type)) return null;
  if (!('value' in event) || isNeverStoreField(event)) return null;
  const value = String(event.value ?? '').trim();
  if (!value || value === '[EMPTY]') return null;
  return {
    key: fieldKey(event),
    label: event.label || event.name || event.placeholder || event.selector || 'Field',
    name: event.name || null,
    inputType: event.inputType || null,
    value,
    sensitive: isCustomerPiiField(event),
    sourceUrl: event.url || null,
    updatedAt: event.at || nowIso()
  };
}

function deriveCustomerLabel(context) {
  const fields = Object.values(context.fields || {});
  const name = fields.find((f) => /name|नाव/i.test(f.label || ''));
  const mobile = fields.find((f) => /mobile|phone|मोबाईल|फोन/i.test(f.label || ''));
  if (name?.value && !name.value.startsWith('[')) return String(name.value).slice(0, 80);
  if (mobile?.value && !mobile.value.startsWith('[')) return `Customer • ${String(mobile.value).slice(-4)}`;
  return context.displayName || 'Customer context';
}

function actionSignature(event) {
  const urlPath = (() => {
    try {
      const u = new URL(event.url || 'https://invalid.local/');
      return `${u.hostname}${u.pathname}`.replace(/\d{4,}/g, ':id');
    } catch {
      return 'unknown';
    }
  })();
  return [event.type, urlPath, event.selector || '', event.label || event.name || '']
    .join('|')
    .toLowerCase()
    .slice(0, 500);
}

function compressActions(events) {
  const useful = events.filter((e) => [
    'page_view', 'navigation', 'click', 'input', 'change', 'submit', 'download', 'error', 'success'
  ].includes(e.type));
  const result = [];
  for (const event of useful) {
    const signature = actionSignature(event);
    const previous = result[result.length - 1];
    if (previous && previous.signature === signature && event.type === 'input') {
      previous.lastSeenAt = event.at;
      continue;
    }
    result.push({
      signature,
      type: event.type,
      url: event.url,
      title: event.title,
      selector: event.selector || null,
      label: event.label || event.name || null,
      text: event.text || null,
      sensitive: Boolean(event.sensitive),
      firstSeenAt: event.at,
      lastSeenAt: event.at
    });
  }
  return result;
}

function workflowFingerprint(actions) {
  return actions.map((a) => a.signature).join('>').slice(0, 12000);
}

function workflowIdForFingerprint(fingerprint) {
  return `workflow_${hashString(fingerprint)}`;
}

function workflowTitle(events, actions) {
  const meaningful = [...events].reverse().find((e) => e.title && !/^new tab$/i.test(e.title));
  if (meaningful?.title) return meaningful.title;
  try { return new URL(actions[0]?.url).hostname; } catch { return 'Observed browser workflow'; }
}

function queueOperation(state, collection, id, kind, payload) {
  const opKey = `${collection}:${id}`;
  const op = {
    opKey,
    collection,
    id,
    kind,
    payload,
    deviceId: state.deviceId,
    updatedAt: nowIso()
  };
  const queue = (state.syncQueue || []).filter((item) => item.opKey !== opKey);
  queue.push(op);
  state.syncQueue = queue.slice(-3000);
}

function mergeCountMaps(a = {}, b = {}) {
  const merged = { ...a };
  for (const [key, value] of Object.entries(b || {})) {
    merged[key] = Math.max(Number(merged[key] || 0), Number(value || 0));
  }
  return merged;
}

function mergeWorkflow(local, remote) {
  if (!local) return remote;
  if (!remote) return local;
  const occurrencesByDevice = mergeCountMaps(local.occurrencesByDevice, remote.occurrencesByDevice);
  const counted = Object.values(occurrencesByDevice).reduce((sum, n) => sum + Number(n || 0), 0);
  const occurrences = Math.max(counted, Number(local.occurrences || 0), Number(remote.occurrences || 0));
  const approved = local.status === 'approved' || remote.status === 'approved';
  const localTime = new Date(local.lastObservedAt || 0).getTime();
  const remoteTime = new Date(remote.lastObservedAt || 0).getTime();
  const newer = remoteTime > localTime ? remote : local;
  return {
    ...newer,
    id: workflowIdForFingerprint(newer.fingerprint || local.fingerprint || remote.fingerprint || ''),
    occurrencesByDevice,
    occurrences,
    status: approved ? 'approved' : 'observed',
    confidence: approved ? Math.max(.9, Number(local.confidence || 0), Number(remote.confidence || 0))
      : Math.min(.95, .35 + occurrences * .12)
  };
}

function publicCloudStatus(state) {
  return {
    connected: Boolean(state.cloudAuth?.refreshToken && state.cloudConfig?.projectId && state.cloudConfig?.apiKey),
    email: state.cloudAuth?.email || null,
    uid: state.cloudAuth?.uid || null,
    projectId: state.cloudConfig?.projectId || '',
    deviceId: state.deviceId,
    deviceName: state.deviceName,
    lastSyncedAt: state.cloudStatus?.lastSyncedAt || null,
    lastError: state.cloudStatus?.lastError || null,
    pending: (state.syncQueue || []).length,
    deviceCount: Number(state.cloudStatus?.deviceCount || 0)
  };
}

async function saveCustomerField(state, segmentId, rawEvent) {
  const field = customerFieldFromEvent(rawEvent, state.settings);
  if (!field) return state;
  const existing = state.customerContexts[segmentId] || {
    id: segmentId,
    segmentId,
    sessionId: state.sessionId,
    deviceId: state.deviceId,
    displayName: 'Customer context',
    status: 'active',
    createdAt: state.segmentStartedAt || rawEvent.at || nowIso(),
    updatedAt: rawEvent.at || nowIso(),
    fields: {},
    websites: []
  };
  const websites = new Set(existing.websites || []);
  try { websites.add(new URL(rawEvent.url).hostname); } catch {}
  const context = {
    ...existing,
    fields: { ...(existing.fields || {}), [field.key]: field },
    websites: [...websites],
    updatedAt: rawEvent.at || nowIso()
  };
  context.displayName = deriveCustomerLabel(context);
  state.customerContexts = { ...state.customerContexts, [segmentId]: context };
  queueOperation(state, 'customers', segmentId, 'customer', context);
  return state;
}

async function learnFromSegment(segmentId, reason = 'manual') {
  if (!segmentId) return null;
  const state = await getState();
  const segmentEvents = state.events.filter((e) => e.segmentId === segmentId);
  const actions = compressActions(segmentEvents);
  if (actions.length < 2) return null;

  const fingerprint = workflowFingerprint(actions);
  const id = workflowIdForFingerprint(fingerprint);
  const existingIndex = state.workflows.findIndex((w) => w.fingerprint === fingerprint || w.id === id);
  const hostname = (() => {
    try { return new URL(actions[0].url).hostname; } catch { return 'Unknown website'; }
  })();
  const title = workflowTitle(segmentEvents, actions);
  const old = existingIndex >= 0 ? state.workflows[existingIndex] : null;
  const counts = { ...(old?.occurrencesByDevice || {}) };
  counts[state.deviceId] = Number(counts[state.deviceId] || 0) + 1;
  const occurrences = Object.values(counts).reduce((sum, n) => sum + Number(n || 0), 0);

  const workflow = {
    ...(old || {}),
    id,
    name: title,
    host: hostname,
    status: old?.status === 'approved' ? 'approved' : 'observed',
    confidence: old?.status === 'approved' ? Math.max(.9, Number(old.confidence || 0)) : Math.min(.95, .35 + occurrences * .12),
    occurrences,
    occurrencesByDevice: counts,
    createdAt: old?.createdAt || nowIso(),
    lastObservedAt: nowIso(),
    fingerprint,
    actions
  };

  if (existingIndex >= 0) state.workflows[existingIndex] = workflow;
  else state.workflows.unshift(workflow);
  state.workflows = state.workflows.slice(0, 250);
  queueOperation(state, 'workflows', id, 'workflow', workflow);

  const customer = state.customerContexts[segmentId];
  if (customer) {
    const completedCustomer = {
      ...customer,
      status: 'completed',
      workflowId: id,
      completedAt: nowIso(),
      updatedAt: nowIso()
    };
    state.customerContexts = { ...state.customerContexts, [segmentId]: completedCustomer };
    queueOperation(state, 'customers', segmentId, 'customer', completedCustomer);
  }

  const observation = {
    id: segmentId,
    segmentId,
    sessionId: segmentEvents[0]?.sessionId || state.sessionId,
    deviceId: state.deviceId,
    workflowId: id,
    reason,
    startedAt: segmentEvents[0]?.at || state.segmentStartedAt || null,
    completedAt: nowIso(),
    host: hostname,
    title,
    actions
  };
  queueOperation(state, 'observations', segmentId, 'observation', observation);

  await setState({
    workflows: state.workflows,
    customerContexts: state.customerContexts,
    syncQueue: state.syncQueue,
    cloudStatus: { ...state.cloudStatus, pending: state.syncQueue.length }
  });
  return workflow;
}

async function appendEvent(rawEvent, sender) {
  let state = await getState();
  if (!state.observing || !state.sessionId) return { ignored: true };

  const eventAt = rawEvent.at || nowIso();
  let segmentId = state.segmentId || uid('segment');
  let segmentStartedAt = state.segmentStartedAt || eventAt;

  if (state.lastEventAt) {
    const gapMs = new Date(eventAt).getTime() - new Date(state.lastEventAt).getTime();
    const gapLimitMs = Math.max(2, Number(state.settings.autoSegmentMinutes || 10)) * 60 * 1000;
    if (gapMs > gapLimitMs) {
      await learnFromSegment(segmentId, 'inactivity_gap');
      state = await getState();
      segmentId = uid('segment');
      segmentStartedAt = eventAt;
    }
  }

  rawEvent = { ...rawEvent, at: eventAt, sessionId: state.sessionId, segmentId, tabId: sender?.tab?.id ?? null };
  state = await saveCustomerField(state, segmentId, rawEvent);

  const event = sanitizeEvent({ ...rawEvent, id: uid('evt') });
  const events = [...state.events, event];
  const maxEvents = Math.max(500, Number(state.settings.maxEvents || 8000));
  if (events.length > maxEvents) events.splice(0, events.length - maxEvents);

  await setState({
    events,
    customerContexts: state.customerContexts,
    syncQueue: state.syncQueue,
    segmentId,
    segmentStartedAt,
    lastEventAt: eventAt,
    cloudStatus: { ...state.cloudStatus, pending: state.syncQueue.length }
  });

  if (state.settings.captureScreenshots && ['error', 'submit'].includes(event.type) && sender?.tab?.windowId) {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'jpeg', quality: 45 });
      const refreshed = await getState();
      const target = refreshed.events.find((e) => e.id === event.id);
      if (target) {
        target.screenshot = dataUrl;
        await setState({ events: refreshed.events });
      }
    } catch (err) {
      console.warn('Screenshot capture skipped:', err?.message || err);
    }
  }

  if (event.type === 'success' && state.settings.learnOnSuccess !== false) {
    const workflow = await learnFromSegment(segmentId, 'success_detected');
    if (workflow) {
      await setState({
        segmentId: uid('segment'),
        segmentStartedAt: nowIso(),
        lastEventAt: eventAt
      });
      syncNow().catch(() => {});
    }
  }

  return { ok: true, id: event.id };
}

async function ensureDeviceIdentity() {
  const state = await getState();
  const patch = {};
  if (!state.deviceId) patch.deviceId = `device_${hashString(`${Date.now()}_${Math.random()}_${navigator.userAgent}`)}`;
  if (!state.deviceName) patch.deviceName = `PC ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  if (Object.keys(patch).length) await setState(patch);
  return { ...state, ...patch };
}

function mergeRemoteData(state, remoteWorkflows, remoteCustomers) {
  let workflows = [...state.workflows];
  for (const item of remoteWorkflows) {
    const remote = item.payload;
    const index = workflows.findIndex((w) => w.id === remote.id || (w.fingerprint && w.fingerprint === remote.fingerprint));
    const local = index >= 0 ? workflows[index] : null;
    const merged = mergeWorkflow(local, remote);
    if (index >= 0) workflows[index] = merged;
    else workflows.push(merged);
    if (JSON.stringify(merged) !== JSON.stringify(remote)) {
      queueOperation(state, 'workflows', merged.id, 'workflow', merged);
    }
  }

  const customerContexts = { ...state.customerContexts };
  for (const item of remoteCustomers) {
    const remote = item.payload;
    const local = customerContexts[remote.id];
    if (!local || new Date(remote.updatedAt || 0) > new Date(local.updatedAt || 0)) {
      customerContexts[remote.id] = remote;
    }
  }

  workflows.sort((a, b) => new Date(b.lastObservedAt || 0) - new Date(a.lastObservedAt || 0));
  return { workflows: workflows.slice(0, 250), customerContexts };
}

async function syncNow() {
  let state = await ensureDeviceIdentity();
  if (!state.cloudConfig?.projectId || !state.cloudConfig?.apiKey || !state.cloudAuth?.refreshToken || !state.cloudAuth?.uid) {
    return { ok: false, skipped: true, status: publicCloudStatus(state) };
  }

  try {
    const auth = await ShadowCloud.ensureToken(state.cloudConfig, state.cloudAuth);
    state.cloudAuth = { ...state.cloudAuth, ...auth };
    const uidScope = state.cloudAuth.uid;

    const [remoteWorkflowResult, remoteCustomerResult, remoteDeviceResult] = await Promise.all([
      ShadowCloud.listCollection(state.cloudConfig, state.cloudAuth, uidScope, 'workflows', 250),
      ShadowCloud.listCollection(state.cloudConfig, state.cloudAuth, uidScope, 'customers', 500),
      ShadowCloud.listCollection(state.cloudConfig, state.cloudAuth, uidScope, 'devices', 100)
    ]);

    const merged = mergeRemoteData(state, remoteWorkflowResult.items, remoteCustomerResult.items);
    state.workflows = merged.workflows;
    state.customerContexts = merged.customerContexts;

    const device = {
      id: state.deviceId,
      name: state.deviceName,
      version: VERSION,
      observing: Boolean(state.observing),
      lastSeenAt: nowIso()
    };
    queueOperation(state, 'devices', state.deviceId, 'device', device);

    const batch = state.syncQueue.slice(0, 100);
    if (batch.length) {
      const result = await ShadowCloud.commit(state.cloudConfig, state.cloudAuth, uidScope, batch);
      state.cloudAuth = { ...state.cloudAuth, ...result.token };
      const completed = new Set(batch.map((op) => op.opKey));
      state.syncQueue = state.syncQueue.filter((op) => !completed.has(op.opKey));
    }

    const knownDevices = new Set(remoteDeviceResult.items.map((item) => item.payload?.id).filter(Boolean));
    knownDevices.add(state.deviceId);
    state.cloudStatus = {
      connected: true,
      lastSyncedAt: nowIso(),
      lastError: null,
      pending: state.syncQueue.length,
      deviceCount: knownDevices.size
    };

    await setState({
      cloudAuth: state.cloudAuth,
      cloudStatus: state.cloudStatus,
      workflows: state.workflows,
      customerContexts: state.customerContexts,
      syncQueue: state.syncQueue,
      deviceId: state.deviceId,
      deviceName: state.deviceName
    });
    return { ok: true, status: publicCloudStatus(state) };
  } catch (error) {
    state.cloudStatus = {
      ...state.cloudStatus,
      connected: Boolean(state.cloudAuth?.refreshToken),
      lastError: error?.message || String(error),
      pending: state.syncQueue.length
    };
    await setState({ cloudStatus: state.cloudStatus });
    return { ok: false, error: state.cloudStatus.lastError, status: publicCloudStatus(state) };
  }
}

async function connectCloud(config, email, password, deviceName) {
  if (!config?.projectId || !config?.apiKey || !email || !password) {
    throw new Error('Project ID, API key, email and password are required');
  }
  let state = await ensureDeviceIdentity();
  const cloudConfig = { projectId: config.projectId.trim(), apiKey: config.apiKey.trim() };
  const auth = await ShadowCloud.signIn(cloudConfig, email.trim(), password);
  state = { ...state, cloudConfig, cloudAuth: auth, deviceName: (deviceName || state.deviceName || '').trim() };
  await setState({
    cloudConfig,
    cloudAuth: auth,
    deviceName: state.deviceName,
    cloudStatus: { ...state.cloudStatus, connected: true, lastError: null }
  });
  return syncNow();
}

async function disconnectCloud() {
  const state = await getState();
  await setState({
    cloudAuth: null,
    cloudStatus: { ...state.cloudStatus, connected: false, lastError: null }
  });
  return { ok: true };
}

function setupSyncAlarm() {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDeviceIdentity();
  setupSyncAlarm();
});
chrome.runtime.onStartup.addListener(() => setupSyncAlarm());
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) syncNow().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || !message.type) return sendResponse({ ok: false, error: 'Invalid message' });

    if (message.type === 'SHADOW_EVENT') return sendResponse(await appendEvent(message.event || {}, sender));
    if (message.type === 'GET_STATE') {
      const state = await ensureDeviceIdentity();
      return sendResponse({ ...state, cloudAuth: state.cloudAuth ? { uid: state.cloudAuth.uid, email: state.cloudAuth.email } : null });
    }
    if (message.type === 'GET_CLOUD_STATUS') {
      const state = await getState();
      return sendResponse(publicCloudStatus(state));
    }
    if (message.type === 'CLOUD_CONNECT') {
      return sendResponse(await connectCloud(message.config || {}, message.email || '', message.password || '', message.deviceName || ''));
    }
    if (message.type === 'CLOUD_DISCONNECT') return sendResponse(await disconnectCloud());
    if (message.type === 'SYNC_NOW') return sendResponse(await syncNow());

    if (message.type === 'START_OBSERVING') {
      const state = await ensureDeviceIdentity();
      const startedAt = nowIso();
      const sessionId = uid('session');
      const segmentId = uid(`segment_${state.deviceId}`);
      await setState({
        observing: true,
        sessionId,
        sessionStartedAt: startedAt,
        segmentId,
        segmentStartedAt: startedAt,
        lastEventAt: null
      });
      return sendResponse({ ok: true, sessionId, segmentId });
    }

    if (message.type === 'STOP_OBSERVING') {
      const state = await getState();
      const workflow = state.segmentId ? await learnFromSegment(state.segmentId, 'observer_stopped') : null;
      await setState({
        observing: false,
        sessionId: null,
        sessionStartedAt: null,
        segmentId: null,
        segmentStartedAt: null,
        lastEventAt: null
      });
      syncNow().catch(() => {});
      return sendResponse({ ok: true, workflow });
    }

    if (message.type === 'UPDATE_SETTINGS') {
      const state = await getState();
      const settings = { ...state.settings, ...(message.settings || {}) };
      await setState({ settings });
      return sendResponse({ ok: true, settings });
    }

    if (message.type === 'UPDATE_DEVICE_NAME') {
      const state = await getState();
      const deviceName = String(message.deviceName || '').trim() || state.deviceName;
      await setState({ deviceName });
      syncNow().catch(() => {});
      return sendResponse({ ok: true, deviceName });
    }

    if (message.type === 'CLEAR_ACTIVITY') {
      await setState({ events: [] });
      return sendResponse({ ok: true });
    }

    if (message.type === 'APPROVE_WORKFLOW') {
      const state = await getState();
      const workflows = state.workflows.map((w) => w.id === message.id
        ? { ...w, status: 'approved', approvedAt: nowIso(), confidence: Math.max(w.confidence || 0, 0.9) }
        : w);
      const approved = workflows.find((w) => w.id === message.id);
      if (approved) queueOperation(state, 'workflows', approved.id, 'workflow', approved);
      await setState({ workflows, syncQueue: state.syncQueue });
      syncNow().catch(() => {});
      return sendResponse({ ok: true });
    }

    if (message.type === 'DELETE_WORKFLOW') {
      const state = await getState();
      await setState({ workflows: state.workflows.filter((w) => w.id !== message.id) });
      return sendResponse({ ok: true });
    }

    return sendResponse({ ok: false, error: 'Unknown message type' });
  })().catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
  return true;
});
