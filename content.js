// ==============================
// PhobiaBlocker Content Script
// Removes tweets mentioning snakes
// ==============================

let removedCount = 0;
let analyticsEnabled = false;
let extensionEnabled = true;

// Snake keyword detection (simple first)
const SNAKE_REGEX = /\b(snake|cobra|python|viper|boa|งู)\b/i;

// ==============================
// Listen to popup changes
// ==============================
chrome.storage.onChanged.addListener((changes) => {

  if (changes.analyticsEnabled) {
    analyticsEnabled = changes.analyticsEnabled.newValue;
    if (!analyticsEnabled) {
      removeAnalyticsBanner();
    }
  }

  if (changes.extensionEnabled) {
    extensionEnabled = changes.extensionEnabled.newValue;

    if (!extensionEnabled) {
      restoreAllTweets();
      removeAnalyticsBanner();
    } else {
      removedCount = 0;
      scanAndRemoveTweets();
    }
  }
});

// ==============================
// Detection logic
// ==============================
function shouldRemoveTweet(article) {
  const text = article.innerText || article.textContent || "";
  return SNAKE_REGEX.test(text);
}

// ==============================
// Remove / Restore
// ==============================
function removeTweet(article) {
  if (!extensionEnabled) return;

  if (shouldRemoveTweet(article)) {
    article.style.display = "none";
    article.dataset.phobiaHidden = "true";
    removedCount++;
    updateAnalyticsBanner();
  }
}

function restoreAllTweets() {
  const hiddenTweets = document.querySelectorAll(
    'article[data-phobia-hidden="true"]'
  );

  hiddenTweets.forEach(tweet => {
    tweet.style.display = "";
    tweet.dataset.phobiaHidden = "false";
  });

  removedCount = 0;
}

// ==============================
// Analytics banner
// ==============================
function createAnalyticsBanner() {
  if (!analyticsEnabled) return null;

  const existing = document.getElementById("phobia-analytics");
  if (existing) return existing;

  const banner = document.createElement("div");
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

  banner.innerHTML =
    `🐍 Blocked tweets: <span id="phobia-count">0</span>`;

  document.body.appendChild(banner);
  return banner;
}

function updateAnalyticsBanner() {
  if (!analyticsEnabled) return;

  const banner = createAnalyticsBanner();
  if (!banner) return;

  const countSpan = banner.querySelector("#phobia-count");
  if (countSpan) {
    countSpan.textContent = removedCount;
  }
}

function removeAnalyticsBanner() {
  const banner = document.getElementById("phobia-analytics");
  if (banner) banner.remove();
}

// ==============================
// Scan logic (core loop)
// ==============================
function scanAndRemoveTweets() {
  if (!extensionEnabled) return;

  const tweets = document.querySelectorAll(
    'article[data-testid="tweet"]'
  );

  tweets.forEach(tweet => {
    if (tweet.dataset.phobiaProcessed) return;

    tweet.dataset.phobiaProcessed = "true";
    removeTweet(tweet);
  });
}

// ==============================
// Initial load
// ==============================
chrome.storage.sync.get(
  ["analyticsEnabled", "extensionEnabled"],
  (result) => {
    analyticsEnabled = result.analyticsEnabled || false;
    extensionEnabled = result.extensionEnabled !== false;

    scanAndRemoveTweets();
  }
);

// ==============================
// Observe dynamic timeline
// ==============================
const observer = new MutationObserver(() => {
  scanAndRemoveTweets();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Backup scan
setInterval(scanAndRemoveTweets, 2000);

// Reset counter on navigation
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    removedCount = 0;
    updateAnalyticsBanner();
  }
}).observe(document, { subtree: true, childList: true });
//content.js
