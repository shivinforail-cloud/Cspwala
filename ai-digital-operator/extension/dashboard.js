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
  const pieces = [action.type, action.label || action.text || action.selector, shortUrl(action.url)].filter(Boolean);
  return pieces.join(' • ');
}

function workflowCard(workflow) {
  const approved = workflow.status === 'approved';
  const confidence = pct(workflow.confidence);
  const preview = (workflow.actions || []).slice(0, 5).map((a) => esc(actionLabel(a))).join('<br>');
  const more = Math.max(0, (workflow.actions || []).length - 5);
  return `
    <article class="workflow" data-workflow-id="${esc(workflow.id)}">
      <div class="workflow-top">
        <div>
          <h3>${esc(workflow.name || workflow.host || 'Observed workflow')}</h3>
          <span class="chip ${approved ? 'ok' : 'warn'}">${approved ? 'APPROVED' : 'OBSERVED'}</span>
          <span class="chip">Seen ${Number(workflow.occurrences || 1)}×</span>
        </div>
        <div class="confidence">${confidence}% confidence</div>
      </div>
      <div class="bar"><i style="width:${confidence}%"></i></div>
      <div class="actions">${preview || 'No action preview'}${more ? `<br>+ ${more} more actions` : ''}</div>
      <div class="workflow-buttons">
        ${approved ? '' : `<button class="approve" data-action="approve" data-id="${esc(workflow.id)}">Approve workflow</button>`}
        <button class="danger" data-action="delete" data-id="${esc(workflow.id)}">Delete</button>
      </div>
    </article>`;
}

function eventRow(event) {
  const time = event.at ? new Date(event.at).toLocaleTimeString() : '';
  const detail = event.label || event.text || event.name || event.selector || '';
  return `
    <div class="event">
      <div class="event-time">${esc(time)}</div>
      <div class="event-type">${esc(event.type || '')}${event.sensitive ? ' 🔒' : ''}</div>
      <div><div>${esc(detail)}</div><div class="event-url">${esc(shortUrl(event.url))}</div></div>
    </div>`;
}

async function render() {
  const state = await send('GET_STATE');
  const events = state.events || [];
  const workflows = state.workflows || [];
  const approved = workflows.filter((w) => w.status === 'approved').length;

  document.getElementById('metricStatus').textContent = state.observing ? 'ON' : 'OFF';
  document.getElementById('metricEvents').textContent = events.length;
  document.getElementById('metricWorkflows').textContent = workflows.length;
  document.getElementById('metricApproved').textContent = approved;

  const statusChip = document.getElementById('statusChip');
  statusChip.textContent = state.observing ? 'OBSERVING' : 'OFF';
  statusChip.className = `chip ${state.observing ? 'ok' : ''}`;
  const toggle = document.getElementById('toggleObserver');
  toggle.textContent = state.observing ? 'Stop & Learn Session' : 'Start Observing';
  toggle.className = state.observing ? 'danger' : 'primary';
  if (state.sessionStartedAt) {
    document.getElementById('sessionInfo').textContent = `Session started: ${new Date(state.sessionStartedAt).toLocaleString()}`;
  } else {
    document.getElementById('sessionInfo').textContent = 'No active observation session.';
  }

  document.getElementById('redactSensitive').checked = state.settings?.redactSensitiveValues !== false;
  document.getElementById('captureScreenshots').checked = Boolean(state.settings?.captureScreenshots);

  const workflowsEl = document.getElementById('workflows');
  workflowsEl.innerHTML = workflows.length
    ? workflows.map(workflowCard).join('')
    : '<div class="empty">अजून workflow शिकलेला नाही. Observer सुरू करून एक complete काम करा आणि Stop & Learn दाबा.</div>';

  const eventsEl = document.getElementById('events');
  const recent = [...events].slice(-80).reverse();
  eventsEl.innerHTML = recent.length
    ? recent.map(eventRow).join('')
    : '<div class="empty">No activity captured yet.</div>';
}

document.getElementById('toggleObserver').addEventListener('click', async () => {
  const state = await send('GET_STATE');
  await send(state.observing ? 'STOP_OBSERVING' : 'START_OBSERVING');
  await render();
});

document.getElementById('redactSensitive').addEventListener('change', async (event) => {
  await send('UPDATE_SETTINGS', { settings: { redactSensitiveValues: event.target.checked } });
  await render();
});

document.getElementById('captureScreenshots').addEventListener('change', async (event) => {
  await send('UPDATE_SETTINGS', { settings: { captureScreenshots: event.target.checked } });
  await render();
});

document.getElementById('clearActivity').addEventListener('click', async () => {
  if (!confirm('Captured activity clear करायची आहे? Learned workflows delete होणार नाहीत.')) return;
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
    if (!confirm('हा learned workflow delete करायचा आहे?')) return;
    await send('DELETE_WORKFLOW', { id });
  }
  await render();
});

document.getElementById('exportJson').addEventListener('click', async () => {
  const state = await send('GET_STATE');
  const payload = {
    exportedAt: new Date().toISOString(),
    product: 'CSPWALA Shadow Agent',
    version: '0.1.0',
    settings: state.settings,
    workflows: state.workflows || [],
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
