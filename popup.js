// ==============================
// PhobiaBlocker Popup Script
// UI logic only
// ==============================

const enableToggle = document.getElementById("enabled-toggle");
const modeRadios = document.querySelectorAll('input[name="mode"]');

const DEFAULT_STATE = {
  extensionEnabled: true,
  mode: "remove"
};

// ==============================
// Load saved state from storage
// ==============================
chrome.storage.sync.get(DEFAULT_STATE, (state) => {
  if (enableToggle) enableToggle.checked = state.extensionEnabled;

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