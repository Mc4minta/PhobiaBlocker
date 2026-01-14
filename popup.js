// ==============================
// PhobiaBlocker Popup Script
// UI logic only
// ==============================

const enableToggle = document.getElementById("enabled-toggle");
const analyticsToggle = document.getElementById("analytics-toggle");
const analyticsBox = document.querySelector(".analytics-box");
const modeRadios = document.querySelectorAll('input[name="mode"]');

// Safety guard
if (!enableToggle || !analyticsToggle || !analyticsBox || modeRadios.length === 0) {
  console.error("PhobiaBlocker popup: required elements not found");
} else {

  const DEFAULT_STATE = {
    extensionEnabled: true,
    analyticsEnabled: false,
    mode: "remove",
    blockedCount: 0
  };

  // Load state
  chrome.storage.sync.get(DEFAULT_STATE, (state) => {
    enableToggle.checked = state.extensionEnabled;
    analyticsToggle.checked = state.analyticsEnabled;

    modeRadios.forEach(radio => {
      radio.checked = radio.value === state.mode;
    });

    analyticsBox.style.display = state.analyticsEnabled ? "block" : "none";
    updateAnalyticsCount(state.blockedCount);
  });

  // Enable / disable
  enableToggle.addEventListener("change", () => {
    chrome.storage.sync.set({
      extensionEnabled: enableToggle.checked
    });
  });

  // Mode change (future use)
  modeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        chrome.storage.sync.set({ mode: radio.value });
      }
    });
  });

  // Analytics toggle
  analyticsToggle.addEventListener("change", () => {
    const enabled = analyticsToggle.checked;
    analyticsBox.style.display = enabled ? "block" : "none";

    chrome.storage.sync.set({
      analyticsEnabled: enabled
    });
  });
}

// Update analytics UI
function updateAnalyticsCount(count) {
  const value = document.querySelector(".analytics-value strong");
  if (value) {
    value.textContent = count;
  }
}
//popup.js