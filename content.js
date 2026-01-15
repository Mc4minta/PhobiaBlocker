// ==============================
// PhobiaBlocker Content Script
// ==============================

let removedCount = 0;
let analyticsEnabled = false;
let extensionEnabled = true;
let currentMode = "remove";

// Snake detection
const SNAKE_REGEX = /\b(snake|cobra|python|viper|boa|งู)\b/i;

// ==============================
// Listen to popup changes
// ==============================
chrome.storage.onChanged.addListener((changes) => {

  if (changes.analyticsEnabled) {
    analyticsEnabled = changes.analyticsEnabled.newValue === true;
    if (!analyticsEnabled) removeAnalyticsBanner();
  }

  if (changes.extensionEnabled) {
    extensionEnabled = changes.extensionEnabled.newValue;

    if (!extensionEnabled) {
      restoreAllTweets();
      removeAnalyticsBanner();
    } else {
      removedCount = 0;
      scanAndProcessTweets();
    }
  }

  if (changes.mode) {
    currentMode = changes.mode.newValue || "remove";
    restoreAllTweets();
    scanAndProcessTweets();
  }
});

// ==============================
// Detection logic
// ==============================
function shouldBlockTweet(article) {
  // TO DO: implement nlp / ml soon


  const text = article.innerText || "";
  return SNAKE_REGEX.test(text);
}

// ==============================
// Process tweet
// ==============================
function processTweet(article) {
  if (!extensionEnabled) return;
  if (!shouldBlockTweet(article)) return;

  if (currentMode === "remove") {
    article.style.display = "none";
    article.dataset.phobiaHidden = "true";
  }

  if (currentMode === "replace") {
    replaceTweetMedia(article);
    article.dataset.phobiaHidden = "true";
  }

  removedCount++;
  updateAnalyticsBanner();
}

// ==============================
// Replace logic (IMAGE ONLY, Twitter-like)
// ==============================
function replaceTweetMedia(article) {

}

// ==============================
// Restore logic
// ==============================
function restoreAllTweets() {
  const tweets = document.querySelectorAll(
    'article[data-phobia-hidden="true"]'
  );

  tweets.forEach(tweet => {
    tweet.style.display = "";
    tweet.dataset.phobiaHidden = "false";
  });

  removedCount = 0;
  chrome.storage.sync.set({ blockedCount: 0 });
}

// ==============================
// Analytics banner (page)
// ==============================
function createAnalyticsBanner() {
  if (!analyticsEnabled) return null;

  let banner = document.getElementById("phobia-analytics");
  if (banner) return banner;

  banner = document.createElement("div");
  banner.id = "phobia-analytics";
  banner.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #111;
    color: white;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10000;
  `;

  banner.innerHTML = `🐍 Blocked tweets: <span id="phobia-count">0</span>`;
  document.body.appendChild(banner);
  return banner;
}

function updateAnalyticsBanner() {
  if (!analyticsEnabled) return;

  chrome.storage.sync.set({
    blockedCount: removedCount
  });

  const banner = createAnalyticsBanner();
  if (!banner) return;

  banner.querySelector("#phobia-count").textContent = removedCount;
}

function removeAnalyticsBanner() {
  const banner = document.getElementById("phobia-analytics");
  if (banner) banner.remove();
}

// ==============================
// Scan logic
// ==============================
function scanAndProcessTweets() {
  if (!extensionEnabled) return;

  const tweets = document.querySelectorAll(
    'article[data-testid="tweet"]'
  );

  tweets.forEach(tweet => {
    if (tweet.dataset.phobiaProcessed) return;
    tweet.dataset.phobiaProcessed = "true";
    processTweet(tweet);
  });
}

// ==============================
// Initial load
// ==============================
chrome.storage.sync.get(
  ["analyticsEnabled", "extensionEnabled", "mode", "blockedCount"],
  (state) => {
    analyticsEnabled = state.analyticsEnabled === true;
    extensionEnabled = state.extensionEnabled !== false;
    currentMode = state.mode || "remove";
    removedCount = state.blockedCount || 0;

    console.log("[PhobiaBlocker] mode =", currentMode);
    scanAndProcessTweets();
  }
);

// ==============================
// Observe dynamic timeline
// ==============================
const observer = new MutationObserver(() => {
  scanAndProcessTweets();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Backup scan
setInterval(scanAndProcessTweets, 2000);

// Reset on navigation
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    removedCount = 0;
    updateAnalyticsBanner();
  }
}).observe(document, { subtree: true, childList: true });
