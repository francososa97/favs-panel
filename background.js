// Abre el panel en una pestaña completa. Si ya hay una abierta, la enfoca.
const PANEL_URL = chrome.runtime.getURL("index.html");

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: PANEL_URL });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: PANEL_URL });
  }
});
