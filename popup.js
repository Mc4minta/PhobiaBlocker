// ==============================
// PhobiaBlocker Popup Script
// UI logic only
// ==============================

console.log("[Popup] popup.js loaded");

const enableToggle = document.getElementById("enabled-toggle");
const analyticsToggle = document.getElementById("analytics-toggle");
const analyticsBox = document.querySelector(".analytics-box");
const modeRadios = document.querySelectorAll('input[name="mode"]');

// ==============================
// Safety guard
// ==============================
if (!enableToggle || !analyticsToggle || !analyticsBox || modeRadios.length === 0) {
  console.error("[Popup] Required DOM elements not found", {
    enableToggle,
    analyticsToggle,
    analyticsBox,
    modeRadiosCount: modeRadios.length
  });
} else {
  console.log("[Popup] All required DOM elements found");

  const DEFAULT_STATE = {
    extensionEnabled: true,
    analyticsEnabled: false,
    mode: "remove",
    blockedCount: 0
  };

  console.log("[Popup] DEFAULT_STATE:", DEFAULT_STATE);

  // ==============================
  // Load saved state from storage
  // ==============================
  chrome.storage.sync.get(DEFAULT_STATE, (state) => {
    console.log("[Popup] Loaded state from chrome.storage:", state);

    enableToggle.checked = state.extensionEnabled;
    analyticsToggle.checked = state.analyticsEnabled;

    modeRadios.forEach(radio => {
      radio.checked = radio.value === state.mode;
      if (radio.checked) {
        console.log("[Popup] Active mode radio:", radio.value);
      }
    });

    analyticsBox.style.display = state.analyticsEnabled ? "block" : "none";
    console.log(
      "[Popup] Analytics UI visibility:",
      analyticsBox.style.display
    );

    updateAnalyticsCount(state.blockedCount);
  });

  // ==============================
  // Enable / Disable extension
  // ==============================
  enableToggle.addEventListener("change", () => {
    console.log(
      "[Popup] Extension enabled toggle changed:",
      enableToggle.checked
    );

    chrome.storage.sync.set({
      extensionEnabled: enableToggle.checked
    }, () => {
      console.log("[Popup] extensionEnabled saved to storage");
    });
  });

  // ==============================
  // Blocking mode switch
  // ==============================
  modeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        console.log("[Popup] Blocking mode changed to:", radio.value);

        chrome.storage.sync.set({
          mode: radio.value
        }, () => {
          console.log("[Popup] mode saved to storage:", radio.value);
        });
      }
    });
  });

  // ==============================
  // Analytics toggle
  // ==============================
  analyticsToggle.addEventListener("change", () => {
    const enabled = analyticsToggle.checked;

    console.log("[Popup] Analytics toggle changed:", enabled);

    analyticsBox.style.display = enabled ? "block" : "none";
    console.log(
      "[Popup] Analytics UI visibility:",
      analyticsBox.style.display
    );

    chrome.storage.sync.set({
      analyticsEnabled: enabled
    }, () => {
      console.log("[Popup] analyticsEnabled saved to storage");
    });
  });
}

// ==============================
// Update analytics UI
// ==============================
function updateAnalyticsCount(count) {
  console.log("[Popup] Updating analytics count:", count);

  const value = document.querySelector(".analytics-value strong");
  if (value) {
    value.textContent = count;
    console.log("[Popup] Analytics count rendered in UI");
  } else {
    console.warn("[Popup] Analytics value element not found");
  }
}
