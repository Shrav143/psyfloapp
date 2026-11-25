// The side panel hosts the same panel page the in-page fallback uses (served by the Psyflo app) and relays
// its messages to the content script (bridge.js) in the active tab, and the bridge's page events back.
const frame = document.getElementById('panel');
let APP = 'http://localhost:4000';
chrome.storage.local.get('appURL', v => { if (v.appURL) APP = v.appURL; frame.src = APP + '/panel/'; });
document.getElementById('save').onclick = () => { const u = document.getElementById('url').value.trim(); chrome.storage.local.set({ appURL: u }, () => location.reload()); };
frame.addEventListener('error', () => { document.getElementById('cfg').style.display = 'block'; });

async function activeTab() { const [t] = await chrome.tabs.query({ active: true, currentWindow: true }); return t; }
window.addEventListener('message', async e => {
  if (e.source !== frame.contentWindow || !e.data || e.data.psyflo !== 'panel') return;
  const tab = await activeTab();
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, e.data, result => {
    if (chrome.runtime.lastError) result = { error: 'This tab is not a Lauris page Psyflo can read.' };
    frame.contentWindow.postMessage({ psyflo: 'bridge', id: e.data.id, result }, new URL(APP).origin);
  });
});
// page events pushed by the bridge in the active tab
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.psyflo !== 'bridge') return;
  activeTab().then(t => { if (t && sender.tab && sender.tab.id === t.id) frame.contentWindow.postMessage(msg, new URL(APP).origin); });
});
// switching tabs or loading a page: ask the panel to re-read
async function reread() { const t = await activeTab(); if (!t) return; chrome.tabs.sendMessage(t.id, { psyflo: 'panel', cmd: 'hello', id: -1 }, result => { if (chrome.runtime.lastError || !result) return; frame.contentWindow.postMessage({ psyflo: 'bridge', type: 'page', page: result.page, event: result.event }, new URL(APP).origin); }); }
chrome.tabs.onActivated.addListener(reread);
chrome.tabs.onUpdated.addListener((id, info) => { if (info.status === 'complete') reread(); });
