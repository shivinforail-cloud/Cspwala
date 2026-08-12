async function message(type, extra = {}) {
  return chrome.runtime.sendMessage({ type, ...extra });
}

function formatSince(iso) {
  if (!iso) return 'No active session';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'Started just now';
  if (minutes < 60) return `Running for ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `Running for ${hours}h ${mins}m`;
}

async function render() {
  const state = await message('GET_STATE');
  const observing = Boolean(state.observing);
  const connected = Boolean(state.cloudAuth?.uid && state.cloudConfig?.projectId && state.cloudConfig?.apiKey);
  document.getElementById('dot').classList.toggle('on', observing);
  document.getElementById('statusText').textContent = observing ? 'Observing ON' : 'Observing OFF';
  document.getElementById('sessionText').textContent = formatSince(state.sessionStartedAt);
  document.getElementById('eventCount').textContent = (state.events || []).length;
  document.getElementById('workflowCount').textContent = (state.workflows || []).length;
  document.getElementById('customerCount').textContent = Object.keys(state.customerContexts || {}).length;
  document.getElementById('deviceCount').textContent = Math.max(1, Number(state.cloudStatus?.deviceCount || 0));
  document.getElementById('cloudText').textContent = connected ? '☁ Cloud Sync: Connected' : '☁ Cloud Sync: Not connected';
  document.getElementById('deviceText').textContent = `${state.deviceName || 'This PC'} • Pending ${(state.syncQueue || []).length}`;

  const button = document.getElementById('toggleBtn');
  button.textContent = observing ? 'Stop & Learn Session' : 'Start Observing';
  button.className = observing ? 'stop' : 'start';
}

document.getElementById('toggleBtn').addEventListener('click', async () => {
  const state = await message('GET_STATE');
  await message(state.observing ? 'STOP_OBSERVING' : 'START_OBSERVING');
  await render();
});

document.getElementById('dashboardBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

render().catch(console.error);
