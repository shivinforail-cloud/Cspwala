const FIXED_FIREBASE_CONFIG = SHADOW_AGENT_FIREBASE;
const EMAIL_PREF_KEY = 'shadowAgentLoginEmail';

async function send(type, extra = {}) {
  return chrome.runtime.sendMessage({ type, ...extra });
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function pct(value) {
  return Math.round(Math.max(0, Math.min(1, Number(value || 0))) * 100);
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return url || '';
  }
}

function actionLabel(action) {
  return [action.type, action.label || action.text || action.selector, shortUrl(action.url)].filter(Boolean).join(' • ');
}

function workflowCard(workflow) {
  const approved = workflow.status === 'approved';
  const confidence = pct(workflow.confidence);
  const preview = (workflow.actions || []).slice(0, 5).map((a) => esc(actionLabel(a))).join('<br>');
  const more = Math.max(0, (workflow.actions || []).length - 5);
  const deviceCount = Object.keys(workflow.occurrencesByDevice || {}).length || 1;
  return `
    <article class="workflow" data-workflow-id="${esc(workflow.id)}">
      <div class="workflow-top">
        <div>
          <h3>${esc(workflow.name || workflow.host || 'Observed workflow')}</h3>
          <span class="chip ${approved ? 'ok' : 'warn'}">${approved ? 'APPROVED' : 'OBSERVED'}</span>
          <span class="chip">Seen ${Number(workflow.occurrences || 1)}×</span>
          <span class="chip">${deviceCount} PC</span>
        </div>
        <div class="confidence">${confidence}% confidence</div>
      </div>
      <div class="bar"><i style="width:${confidence}%"></i></div>
      <div class="actions">${preview || 'No action preview'}${more ? `<br>+ ${more} more actions` : ''}</div>
      <div class="workflow-buttons">
        ${approved ? '' : `<button class="approve" data-action="approve" data-id="${esc(workflow.id)}">Approve workflow</button>`}
        <button class="danger" data-action="delete" data-id="${esc(workflow.id)}">Delete local copy</button>
      </div>
    </article>`;
}

function maskValue(value) {
  const text = String(value ?? '');
  if (!text || text.startsWith('[')) return text;
  if (text.length <= 3) return '•••';
  if (text.length <= 6) return `${text[0]}••${text[text.length - 1]}`;
  return `${text.slice(0, 1)}••••${text.slice(-2)}`;
}

function customerCard(context, maskDetails) {
  const fields = Object.values(context.fields || {}).slice(0, 12);
  const fieldHtml = fields.map((field) => {
    const shown = maskDetails ? maskValue(field.value) : field.value;
    return `<div class="customer-field"><b>${esc(field.label || field.name || 'Field')}${field.sensitive ? ' 🔒' : ''}</b><span>${esc(shown)}</span></div>`;
  }).join('');
  const sites = (context.websites || []).slice(0, 4).map(esc).join(', ');
  return `
    <article class="customer">
      <div class="customer-top">
        <div><h3>${esc(context.displayName || 'Customer context')}</h3><span class="chip ${context.status === 'completed' ? 'ok' : 'warn'}">${esc((context.status || 'active').toUpperCase())}</span> <span class="chip">${fields.length} fields</span></div>
        <span class="chip">${esc(context.deviceId || '')}</span>
      </div>
      <div class="actions">${sites ? `Sites: ${sites}` : ''}</div>
      <div class="customer-fields">${fieldHtml || '<span class="note">No captured customer fields.</span>'}</div>
    </article>`;
}

function eventRow(event) {
  const time = event.at ? new Date(event.at).toLocaleTimeString() : '';
  const detail = event.label || event.text || event.name || event.selector || '';
  return `
    <div class="event">
      <div class="event-time">${esc(time)}</div>
      <div class="event-type">${esc(event.type || '')}${event.sensitive ? ' 🔒' : ''}${event.secret ? ' ⛔' : ''}</div>
      <div><div>${esc(detail)}</div><div class="event-url">${esc(shortUrl(event.url))}</div></div>
    </div>`;
}

function friendlyTime(iso) {
  if (!iso) return 'Never';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function shortId(value) {
  if (!value) return 'None';
  const text = String(value);
  return text.length > 24 ? `${text.slice(0, 12)}…${text.slice(-8)}` : text;
}

function setInputIfIdle(id, value) {
  const el = document.getElementById(id);
  if (el && document.activeElement !== el) el.value = value || '';
}

function setInputOnlyWhenEmpty(id, value) {
  const el = document.getElementById(id);
  if (!el || document.activeElement === el) return;
  if (!String(el.value || '').trim() && value) el.value = value;
}

function rememberedEmail(state) {
  return state.cloudAuth?.email || state.lastLoginEmail || localStorage.getItem(EMAIL_PREF_KEY) || '';
}

function setStatusMessage(text, mode = 'warn') {
  const el = document.getElementById('cloudError');
  el.textContent = text;
  el.className = `statusmsg ${mode}`;
}

function applyAuthControls(authenticated) {
  const connect = document.getElementById('connectCloud');
  const sync = document.getElementById('syncNow');
  const disconnect = document.getElementById('disconnectCloud');
  const password = document.getElementById('cloudPassword');
  const email = document.getElementById('cloudEmail');

  connect.hidden = authenticated;
  sync.hidden = !authenticated;
  disconnect.hidden = !authenticated;
  sync.disabled = !authenticated;
  disconnect.disabled = !authenticated;
  password.closest('.field').hidden = authenticated;
  email.readOnly = authenticated;
}

async function render() {
  let state;
  try {
    state = await send('GET_STATE');
  } catch (error) {
    setStatusMessage(`Extension background error: ${error?.message || error}`, 'bad');
    return;
  }

  const events = state.events || [];
  const workflows = state.workflows || [];
  const customers = Object.values(state.customerContexts || {}).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  const authenticated = Boolean(state.cloudAuth?.uid);
  const synced = Boolean(authenticated && state.cloudStatus?.synced && state.cloudStatus?.lastSyncedAt && !state.cloudStatus?.lastError);
  const activeSessions = Number(state.cloudStatus?.activeSessionCount || (state.observing ? 1 : 0));
  const syncedPcs = Number(state.cloudStatus?.deviceCount || (authenticated ? 1 : 0));
  const emailValue = rememberedEmail(state);

  document.getElementById('metricStatus').textContent = state.observing ? 'ON' : 'OFF';
  document.getElementById('metricEvents').textContent = events.length;
  document.getElementById('metricWorkflows').textContent = workflows.length;
  document.getElementById('metricCustomers').textContent = customers.length;
  document.getElementById('metricCloud').textContent = synced ? 'ON' : (authenticated ? 'AUTH' : 'OFF');
  document.getElementById('metricDevices').textContent = `${activeSessions} / ${syncedPcs}`;

  const statusChip = document.getElementById('statusChip');
  statusChip.textContent = state.observing ? 'ACTIVE' : 'OFF';
  statusChip.className = `chip ${state.observing ? 'ok' : ''}`;
  const toggle = document.getElementById('toggleObserver');
  toggle.textContent = state.observing ? 'Stop Observing & Learn' : 'Start Observing';
  toggle.className = state.observing ? 'danger' : 'primary';

  const sessionInfo = document.getElementById('sessionInfo');
  if (state.observing && state.sessionId) {
    sessionInfo.textContent = `🟢 Active session • ${shortId(state.sessionId)} • Started ${friendlyTime(state.sessionStartedAt)}`;
    sessionInfo.className = 'statusmsg ok';
  } else {
    sessionInfo.textContent = 'No active observation session.';
    sessionInfo.className = 'statusmsg warn';
  }

  document.getElementById('captureCustomerDetails').checked = state.settings?.captureCustomerDetails !== false;
  document.getElementById('maskCustomerDetails').checked = state.settings?.maskCustomerDetailsInDashboard !== false;
  document.getElementById('captureScreenshots').checked = Boolean(state.settings?.captureScreenshots);

  document.getElementById('workflows').innerHTML = workflows.length
    ? workflows.map(workflowCard).join('')
    : '<div class="empty">अजून workflow शिकलेला नाही. Observer ACTIVE करून दुसऱ्या website/tab वर नेहमीप्रमाणे काम करा.</div>';

  const recentCustomers = customers.slice(0, 30);
  document.getElementById('customers').innerHTML = recentCustomers.length
    ? recentCustomers.map((c) => customerCard(c, state.settings?.maskCustomerDetailsInDashboard !== false)).join('')
    : '<div class="empty">Customer context अजून capture झालेला नाही.</div>';

  const recent = [...events].slice(-80).reverse();
  document.getElementById('events').innerHTML = recent.length
    ? recent.map(eventRow).join('')
    : '<div class="empty">No activity captured yet. Dashboard tab itself is not counted; work on normal web pages is observed.</div>';

  const cloudChip = document.getElementById('cloudChip');
  if (synced) {
    cloudChip.textContent = 'ONLINE SYNC';
    cloudChip.className = 'chip ok';
  } else if (authenticated) {
    cloudChip.textContent = 'AUTHENTICATED';
    cloudChip.className = 'chip warn';
  } else {
    cloudChip.textContent = 'SIGN IN REQUIRED';
    cloudChip.className = 'chip bad';
  }

  document.getElementById('cloudDevice').textContent = `${state.deviceName || 'This PC'} (${shortId(state.deviceId)})`;
  document.getElementById('cloudAccount').textContent = authenticated ? emailValue : (emailValue || 'Not signed in');
  document.getElementById('cloudAuthState').textContent = authenticated ? 'YES' : 'NO';
  document.getElementById('cloudSyncState').textContent = synced ? 'YES' : 'NO';
  document.getElementById('cloudActiveSessions').textContent = String(activeSessions);
  document.getElementById('cloudSession').textContent = state.observing ? shortId(state.sessionId) : 'None';
  document.getElementById('cloudLastSync').textContent = friendlyTime(state.cloudStatus?.lastSyncedAt);
  document.getElementById('cloudPending').textContent = String((state.syncQueue || []).length);

  setInputIfIdle('deviceName', state.deviceName || '');
  setInputIfIdle('projectId', FIXED_FIREBASE_CONFIG.projectId);
  setInputIfIdle('apiKey', FIXED_FIREBASE_CONFIG.apiKey);
  setInputOnlyWhenEmpty('cloudEmail', emailValue);
  applyAuthControls(authenticated);

  if (authenticated && state.cloudStatus?.lastError) {
    setStatusMessage(`Sync error: ${state.cloudStatus.lastError}`, 'bad');
  } else if (synced && state.observing) {
    setStatusMessage(`✅ Signed in, Firestore synced and session ACTIVE. Last sync: ${friendlyTime(state.cloudStatus.lastSyncedAt)}`, 'ok');
  } else if (synced) {
    setStatusMessage('✅ Firebase sign-in and Firestore sync successful. Observer is currently OFF.', 'ok');
  } else if (authenticated) {
    setStatusMessage('Firebase Authentication successful. Firestore sync pending; Sync Now वापरा.', 'warn');
  } else {
    setStatusMessage('पहिल्यांदा Firebase login आवश्यक आहे. Email + password देऊन Connect, Sync & Start दाबा. Successful login नंतर auto-sync password शिवाय चालू राहील.', 'warn');
  }
}

document.getElementById('cloudEmail').addEventListener('input', (event) => {
  const email = event.target.value.trim();
  if (email) localStorage.setItem(EMAIL_PREF_KEY, email);
});

document.getElementById('toggleObserver').addEventListener('click', async () => {
  const button = document.getElementById('toggleObserver');
  button.disabled = true;
  try {
    const state = await send('GET_STATE');
    const result = await send(state.observing ? 'STOP_OBSERVING' : 'START_OBSERVING');
    if (!result?.ok) throw new Error(result?.error || 'Observer state update failed');
  } catch (error) {
    setStatusMessage(`Observer error: ${error?.message || error}`, 'bad');
  } finally {
    button.disabled = false;
    await render();
  }
});

document.getElementById('captureCustomerDetails').addEventListener('change', async (event) => {
  await send('UPDATE_SETTINGS', { settings: { captureCustomerDetails: event.target.checked } });
  await render();
});

document.getElementById('maskCustomerDetails').addEventListener('change', async (event) => {
  await send('UPDATE_SETTINGS', { settings: { maskCustomerDetailsInDashboard: event.target.checked } });
  await render();
});

document.getElementById('captureScreenshots').addEventListener('change', async (event) => {
  await send('UPDATE_SETTINGS', { settings: { captureScreenshots: event.target.checked } });
  await render();
});

document.getElementById('connectCloud').addEventListener('click', async () => {
  const button = document.getElementById('connectCloud');
  button.disabled = true;
  setStatusMessage('Connecting to Firebase Authentication...', 'warn');
  try {
    const email = document.getElementById('cloudEmail').value.trim();
    const password = document.getElementById('cloudPassword').value;
    if (!email) throw new Error('Firebase Login Email टाका.');
    if (!password) throw new Error('Firebase Authentication password टाका.');
    localStorage.setItem(EMAIL_PREF_KEY, email);

    const result = await send('CLOUD_CONNECT', {
      email,
      password,
      deviceName: document.getElementById('deviceName').value.trim()
    });
    if (!result?.ok) throw new Error(result?.error || 'Firebase connection failed');
    document.getElementById('cloudPassword').value = '';
    setStatusMessage(result.observerStarted
      ? '✅ Firebase connected, Firestore synced आणि Observer automatically ACTIVE झाला.'
      : '✅ Firebase connected and Firestore synced.', 'ok');
  } catch (error) {
    setStatusMessage(`Connection error: ${error?.message || error}`, 'bad');
  } finally {
    button.disabled = false;
    await render();
  }
});

document.getElementById('syncNow').addEventListener('click', async () => {
  const state = await send('GET_STATE');
  if (!state.cloudAuth?.uid) {
    setStatusMessage('Sync करण्यापूर्वी Firebase account ला Connect करा.', 'bad');
    return;
  }
  setStatusMessage('Syncing with Firestore...', 'warn');
  try {
    const name = document.getElementById('deviceName').value.trim();
    if (name) await send('UPDATE_DEVICE_NAME', { deviceName: name });
    const result = await send('SYNC_NOW');
    if (!result?.ok) throw new Error(result?.error || 'Sync failed');
    setStatusMessage('✅ Firestore sync completed.', 'ok');
  } catch (error) {
    setStatusMessage(`Sync error: ${error?.message || error}`, 'bad');
  } finally {
    await render();
  }
});

document.getElementById('disconnectCloud').addEventListener('click', async () => {
  await send('CLOUD_DISCONNECT');
  document.getElementById('cloudPassword').value = '';
  await render();
});

document.getElementById('clearActivity').addEventListener('click', async () => {
  if (!confirm('Local captured activity clear करायची आहे? Cloud workflows/customer contexts delete होणार नाहीत.')) return;
  await send('CLEAR_ACTIVITY');
  await render();
});

document.getElementById('workflows').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === 'approve') {
    await send('APPROVE_WORKFLOW', { id });
  } else if (button.dataset.action === 'delete') {
    if (!confirm('हा workflow फक्त या PC च्या local list मधून remove करायचा आहे?')) return;
    await send('DELETE_WORKFLOW', { id });
  }
  await render();
});

document.getElementById('exportJson').addEventListener('click', async () => {
  const state = await send('GET_STATE');
  const payload = {
    exportedAt: new Date().toISOString(),
    product: 'CSPWALA Shadow Agent',
    version: '0.2.3',
    deviceId: state.deviceId,
    deviceName: state.deviceName,
    settings: state.settings,
    workflows: state.workflows || [],
    customerContexts: state.customerContexts || {},
    events: state.events || []
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cspwala-shadow-agent-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
});

render().catch((error) => setStatusMessage(`Dashboard error: ${error?.message || error}`, 'bad'));
setInterval(() => render().catch(() => {}), 4000);
