// ==============================
// PhobiaBlocker Popup Script
// UI logic only
// ==============================

const enableToggle = document.getElementById("enabled-toggle");
const analyticsToggle = document.getElementById("analytics-toggle");
const modeRadios = document.querySelectorAll('input[name="mode"]');

const DEFAULT_STATE = {
  extensionEnabled: true,
  analyticsEnabled: false,
  mode: "remove",
  blockedCount: 0
};

// ==============================
// Load saved state from storage
// ==============================
chrome.storage.sync.get(DEFAULT_STATE, (state) => {
  if (enableToggle) enableToggle.checked = state.extensionEnabled;
  if (analyticsToggle) analyticsToggle.checked = state.analyticsEnabled;

  modeRadios.forEach(radio => {
    radio.checked = radio.value === state.mode;
  });
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

// ==============================
// Blocking mode switch
// ==============================
modeRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      chrome.storage.sync.set({
        mode: radio.value
      });
    }
  });
});

// ==============================
// Analytics toggle
// ==============================
if (analyticsToggle) {
  analyticsToggle.addEventListener("change", () => {
    chrome.storage.sync.set({
      analyticsEnabled: analyticsToggle.checked
    });
  });
}
