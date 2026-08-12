const DEFAULTS = {
  observing: false,
  sessionId: null,
  sessionStartedAt: null,
  events: [],
  workflows: [],
  settings: {
    captureScreenshots: false,
    maxEvents: 8000,
    redactSensitiveValues: true
  }
};

const SENSITIVE_HINTS = [
  'password', 'passcode', 'pin', 'otp', 'cvv', 'aadhaar', 'aadhar', 'pan',
  'account', 'ifsc', 'mobile', 'phone', 'email', 'dob', 'birth', 'biometric'
];

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function getState() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return {
    ...DEFAULTS,
    ...stored,
    settings: { ...DEFAULTS.settings, ...(stored.settings || {}) }
  };
}

async function setState(patch) {
  await chrome.storage.local.set(patch);
}

function isSensitive(event) {
  const haystack = [event.name, event.label, event.placeholder, event.selector, event.inputType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return SENSITIVE_HINTS.some((hint) => haystack.includes(hint));
}

function sanitizeEvent(event, settings) {
  const clean = { ...event };
  if (settings.redactSensitiveValues !== false && (isSensitive(clean) || clean.inputType === 'password')) {
    if ('value' in clean) clean.value = '[REDACTED]';
    clean.sensitive = true;
  }
  if (typeof clean.value === 'string' && clean.value.length > 120) {
    clean.value = `${clean.value.slice(0, 117)}...`;
  }
  return clean;
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
    'page_view', 'click', 'input', 'change', 'submit', 'download', 'error', 'success'
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

async function learnFromSession(sessionId) {
  const state = await getState();
  const sessionEvents = state.events.filter((e) => e.sessionId === sessionId);
  const actions = compressActions(sessionEvents);
  if (actions.length < 2) return null;

  const fingerprint = workflowFingerprint(actions);
  const existingIndex = state.workflows.findIndex((w) => w.fingerprint === fingerprint);
  const hostname = (() => {
    try { return new URL(actions[0].url).hostname; } catch { return 'Unknown website'; }
  })();
  const title = sessionEvents.find((e) => e.title)?.title || hostname;

  let workflow;
  if (existingIndex >= 0) {
    workflow = {
      ...state.workflows[existingIndex],
      occurrences: (state.workflows[existingIndex].occurrences || 1) + 1,
      lastObservedAt: nowIso(),
      confidence: Math.min(0.95, 0.35 + ((state.workflows[existingIndex].occurrences || 1) + 1) * 0.12)
    };
    state.workflows[existingIndex] = workflow;
  } else {
    workflow = {
      id: uid('workflow'),
      name: title,
      host: hostname,
      status: 'observed',
      confidence: 0.35,
      occurrences: 1,
      createdAt: nowIso(),
      lastObservedAt: nowIso(),
      fingerprint,
      actions
    };
    state.workflows.unshift(workflow);
  }

  await setState({ workflows: state.workflows.slice(0, 250) });
  return workflow;
}

async function appendEvent(rawEvent, sender) {
  const state = await getState();
  if (!state.observing || !state.sessionId) return { ignored: true };

  const event = sanitizeEvent({
    ...rawEvent,
    id: uid('evt'),
    at: rawEvent.at || nowIso(),
    sessionId: state.sessionId,
    tabId: sender?.tab?.id ?? rawEvent.tabId ?? null
  }, state.settings);

  const events = [...state.events, event];
  const maxEvents = Math.max(500, Number(state.settings.maxEvents || 8000));
  if (events.length > maxEvents) events.splice(0, events.length - maxEvents);
  await setState({ events });

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

  return { ok: true, id: event.id };
}

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  await setState(state);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || !message.type) return sendResponse({ ok: false, error: 'Invalid message' });

    if (message.type === 'SHADOW_EVENT') {
      return sendResponse(await appendEvent(message.event || {}, sender));
    }

    if (message.type === 'GET_STATE') {
      return sendResponse(await getState());
    }

    if (message.type === 'START_OBSERVING') {
      const sessionId = uid('session');
      await setState({ observing: true, sessionId, sessionStartedAt: nowIso() });
      return sendResponse({ ok: true, sessionId });
    }

    if (message.type === 'STOP_OBSERVING') {
      const state = await getState();
      const endedSessionId = state.sessionId;
      await setState({ observing: false, sessionId: null, sessionStartedAt: null });
      const workflow = endedSessionId ? await learnFromSession(endedSessionId) : null;
      return sendResponse({ ok: true, workflow });
    }

    if (message.type === 'UPDATE_SETTINGS') {
      const state = await getState();
      const settings = { ...state.settings, ...(message.settings || {}) };
      await setState({ settings });
      return sendResponse({ ok: true, settings });
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
      await setState({ workflows });
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
