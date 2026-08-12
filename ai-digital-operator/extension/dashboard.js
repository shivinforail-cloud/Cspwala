const FIXED_FIREBASE_CONFIG = SHADOW_AGENT_FIREBASE;

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

function setInputIfIdle(id, value) {
  const el = document.getElementById(id);
  if (document.activeElement !== el) el.value = value || '';
}

function isStandaloneProject(state) {
  return state.cloudConfig?.projectId === FIXED_FIREBASE_CONFIG.projectId;
}

async function render() {
  const state = await send('GET_STATE');
  const events = state.events || [];
  const workflows = state.workflows || [];
  const customers = Object.values(state.customerContexts || {}).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  const cloudConnected = Boolean(state.cloudAuth?.uid && isStandaloneProject(state));

  document.getElementById('metricStatus').textContent = state.observing ? 'ON' : 'OFF';
  document.getElementById('metricEvents').textContent = events.length;
  document.getElementById('metricWorkflows').textContent = workflows.length;
  document.getElementById('metricCustomers').textContent = customers.length;
  document.getElementById('metricCloud').textContent = cloudConnected ? 'ON' : 'OFF';
  document.getElementById('metricDevices').textContent = Math.max(1, Number(state.cloudStatus?.deviceCount || 0));

  const statusChip = document.getElementById('statusChip');
  statusChip.textContent = state.observing ? 'OBSERVING' : 'OFF';
  statusChip.className = `chip ${state.observing ? 'ok' : ''}`;
  const toggle = document.getElementById('toggleObserver');
  toggle.textContent = state.observing ? 'Stop & Learn Session' : 'Start Observing';
  toggle.className = state.observing ? 'danger' : 'primary';
  document.getElementById('sessionInfo').textContent = state.sessionStartedAt
    ? `Session started: ${new Date(state.sessionStartedAt).toLocaleString()}`
    : 'No active observation session.';

  document.getElementById('captureCustomerDetails').checked = state.settings?.captureCustomerDetails !== false;
  document.getElementById('maskCustomerDetails').checked = state.settings?.maskCustomerDetailsInDashboard !== false;
  document.getElementById('captureScreenshots').checked = Boolean(state.settings?.captureScreenshots);

  const workflowsEl = document.getElementById('workflows');
  workflowsEl.innerHTML = workflows.length
    ? workflows.map(workflowCard).join('')
    : '<div class="empty">अजून workflow शिकलेला नाही. Observer सुरू करून नेहमीप्रमाणे काम करा.</div>';

  const customersEl = document.getElementById('customers');
  const recentCustomers = customers.slice(0, 30);
  customersEl.innerHTML = recentCustomers.length
    ? recentCustomers.map((c) => customerCard(c, state.settings?.maskCustomerDetailsInDashboard !== false)).join('')
    : '<div class="empty">Customer context अजून capture झालेला नाही.</div>';

  const eventsEl = document.getElementById('events');
  const recent = [...events].slice(-80).reverse();
  eventsEl.innerHTML = recent.length ? recent.map(eventRow).join('') : '<div class="empty">No activity captured yet.</div>';

  const cloudChip = document.getElementById('cloudChip');
  cloudChip.textContent = cloudConnected ? 'ONLINE SYNC' : 'OFFLINE';
  cloudChip.className = `chip ${cloudConnected ? 'ok' : ''}`;
  document.getElementById('cloudDevice').textContent = `${state.deviceName || 'This PC'} (${state.deviceId || '-'})`;
  document.getElementById('cloudAccount').textContent = cloudConnected ? (state.cloudAuth?.email || 'Connected') : 'Not connected';
  document.getElementById('cloudLastSync').textContent = friendlyTime(state.cloudStatus?.lastSyncedAt);
  document.getElementById('cloudPending').textContent = String((state.syncQueue || []).length);

  let cloudMessage = state.cloudStatus?.lastError ? `Sync error: ${state.cloudStatus.lastError}` : '';
  if (state.cloudAuth?.uid && state.cloudConfig?.projectId && !isStandaloneProject(state)) {
    cloudMessage = `Old Firebase connection detected (${state.cloudConfig.projectId}). Click Connect & Sync to move this PC to ${FIXED_FIREBASE_CONFIG.projectId}.`;
  }
  document.getElementById('cloudError').textContent = cloudMessage;

  setInputIfIdle('deviceName', state.deviceName || '');
  setInputIfIdle('projectId', FIXED_FIREBASE_CONFIG.projectId);
  setInputIfIdle('apiKey', FIXED_FIREBASE_CONFIG.apiKey);
  setInputIfIdle('cloudEmail', cloudConnected ? (state.cloudAuth?.email || '') : '');
}

document.getElementById('toggleObserver').addEventListener('click', async () => {
  const state = await send('GET_STATE');
  await send(state.observing ? 'STOP_OBSERVING' : 'START_OBSERVING');
  await render();
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
  document.getElementById('cloudError').textContent = 'Connecting to standalone Firebase...';
  try {
    const email = document.getElementById('cloudEmail').value.trim();
    const password = document.getElementById('cloudPassword').value;
    if (!email || !password) throw new Error('Firebase login email and password are required');

    const result = await send('CLOUD_CONNECT', {
      config: {
        projectId: FIXED_FIREBASE_CONFIG.projectId,
        apiKey: FIXED_FIREBASE_CONFIG.apiKey
      },
      email,
      password,
      deviceName: document.getElementById('deviceName').value.trim()
    });
    document.getElementById('cloudPassword').value = '';
    if (!result?.ok) throw new Error(result?.error || 'Cloud sync connection failed');
  } catch (error) {
    document.getElementById('cloudError').textContent = error?.message || String(error);
  } finally {
    button.disabled = false;
    await render();
  }
});

document.getElementById('syncNow').addEventListener('click', async () => {
  const state = await send('GET_STATE');
  if (!isStandaloneProject(state)) {
    document.getElementById('cloudError').textContent = `Connect this PC to ${FIXED_FIREBASE_CONFIG.projectId} first.`;
    return;
  }
  const name = document.getElementById('deviceName').value.trim();
  if (name) await send('UPDATE_DEVICE_NAME', { deviceName: name });
  const result = await send('SYNC_NOW');
  if (!result?.ok && !result?.skipped) document.getElementById('cloudError').textContent = result?.error || 'Sync failed';
  await render();
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
    version: '0.2.0',
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

render().catch(console.error);
setInterval(() => render().catch(() => {}), 5000);
