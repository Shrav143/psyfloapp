// Opens the side panel from the toolbar button and relays bridge events to it.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
