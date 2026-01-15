// ==============================
// PhobiaBlocker Popup Script
// UI logic only
// ==============================

document.addEventListener("DOMContentLoaded", async () => {
  const DEFAULT_STATE = {
    extensionEnabled: true
  };

  const enableToggle = document.getElementById("enabled-toggle");

  // ==============================
  // Load saved state from storage
  // ==============================
  chrome.storage.sync.get(DEFAULT_STATE, (state) => {
    if (enableToggle) enableToggle.checked = state.extensionEnabled;
  });

  // ==============================
  // Enable / Disable extension
  // ==============================
  if (enableToggle) {
    enableToggle.addEventListener("change", () => {
      chrome.storage.sync.set({
        extensionEnabled: enableToggle.checked
      });
    });
  }
});
