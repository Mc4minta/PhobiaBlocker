// ==============================
// PhobiaBlocker Content Script
// ==============================

let removedCount = 0;
let analyticsEnabled = false;
let extensionEnabled = true;
let currentMode = "remove";

// Snake detection pattern (keywords + common emojis)
const SNAKE_REGEX = /\b(snake|cobra|python|viper|boa|งู)\b|🐍|🐍|🐍/i;

// ==============================
// Listen to popup changes
// ==============================
chrome.storage.onChanged.addListener((changes) => {
  if (changes.analyticsEnabled) {
    analyticsEnabled = changes.analyticsEnabled.newValue === true;
    analyticsEnabled ? updateAnalyticsBanner() : removeAnalyticsBanner();
  }

  if (changes.extensionEnabled) {
    extensionEnabled = changes.extensionEnabled.newValue;
    if (!extensionEnabled) {
      restoreAllTweets();
      removeAnalyticsBanner();
    } else {
      location.reload(); // Refresh when turned back ON
    }
  }

  if (changes.mode) {
    location.reload(); // Refresh when mode changes
  }
});

// ==============================
// Detection logic (Robust)
// ==============================
function shouldBlockTweet(article) {
  const text = article.innerText || article.textContent || "";

  // 1. Check text content
  if (SNAKE_REGEX.test(text)) return true;

  // 2. Check image alt text (Twitter often puts descriptions here)
  const images = article.querySelectorAll("img");
  for (const img of images) {
    if (SNAKE_REGEX.test(img.getAttribute("alt") || "")) return true;
  }

  return false;
}

// ==============================
// Processing Modes
// ==============================
function processTweet(article) {
  if (!extensionEnabled) return;
  if (!shouldBlockTweet(article)) return;

  if (currentMode === "remove") {
    article.style.display = "none";
    article.dataset.phobiaHidden = "true";
  } else if (currentMode === "replace") {
    replaceTweetMedia(article);
    article.dataset.phobiaHidden = "true";
  }

  removedCount++;
  updateAnalyticsBanner();
}

/**
 * Replace images with a "Shield" placeholder
 */
function replaceTweetMedia(article) {
  const mediaContainers = article.querySelectorAll('div[data-testid="tweetPhoto"], div[role="presentation"] img');

  mediaContainers.forEach(media => {
    // If it's an image, hide it and add a placeholder
    const img = media.tagName === "IMG" ? media : media.querySelector("img");
    if (!img || img.dataset.phobiaReplaced) return;

    img.dataset.phobiaReplaced = "true";
    img.style.visibility = "hidden"; // Keep layout, hide image

    const placeholder = document.createElement("div");
    placeholder.className = "phobia-shield-placeholder";
    placeholder.style.cssText = `
      position: absolute;
      inset: 0;
      background: #15202b;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 1px solid #333;
      border-radius: 12px;
      z-index: 5;
      color: #8899a6;
      font-family: ${BANNER_FONT};
    `;

    placeholder.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 8px;">🛡️</div>
      <div style="font-size: 13px; font-weight: 600;">Content Filtered</div>
    `;

    // Ensure parent is relative so absolute inset works
    const container = img.parentElement;
    if (container) {
      container.style.position = "relative";
      container.appendChild(placeholder);
    }
  });
}

// ==============================
// Restore logic (Smart)
// ==============================
function restoreAllTweets() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');

  tweets.forEach(tweet => {
    tweet.style.display = "";
    tweet.dataset.phobiaHidden = "false";
    delete tweet.dataset.phobiaProcessed;

    // Remove replace placeholders
    tweet.querySelectorAll(".phobia-shield-placeholder").forEach(p => p.remove());
    tweet.querySelectorAll("img[data-phobia-replaced]").forEach(img => {
      img.style.visibility = "visible";
      delete img.dataset.phobiaReplaced;
    });
  });

  removedCount = 0;
  chrome.storage.sync.set({ blockedCount: 0 });
}

// ==============================
// Analytics banner (Polished)
// ==============================
function createAnalyticsBanner() {
  if (!analyticsEnabled) return null;

  let banner = document.getElementById("phobia-analytics");
  if (banner) return banner;

  banner = document.createElement("div");
  banner.id = "phobia-analytics";
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${BANNER_GRADIENT};
    color: white;
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    font-family: ${BANNER_FONT};
    box-shadow: ${BANNER_SHADOW};
    z-index: 99999;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  banner.innerHTML = `
    <span style="font-size: 18px;">🛡️</span>
    <span>Blocked: <strong id="phobia-count" style="color: #4facfe;">0</strong></span>
  `;

  document.body.appendChild(banner);
  return banner;
}

function updateAnalyticsBanner() {
  if (!analyticsEnabled) return;

  chrome.storage.sync.set({ blockedCount: removedCount });

  const banner = createAnalyticsBanner();
  if (!banner) return;

  const countEl = banner.querySelector("#phobia-count");
  if (countEl) countEl.textContent = removedCount;
}

function removeAnalyticsBanner() {
  const banner = document.getElementById("phobia-analytics");
  if (banner) banner.remove();
}

// ==============================
// Scan loop
// ==============================
function scanAndProcessTweets() {
  if (!extensionEnabled) return;

  const tweets = document.querySelectorAll('article[data-testid="tweet"]');

  tweets.forEach(tweet => {
    if (tweet.dataset.phobiaProcessed) return;
    tweet.dataset.phobiaProcessed = "true";
    processTweet(tweet);
  });
}

// ==============================
// Lifecycle
// ==============================
chrome.storage.sync.get(
  ["analyticsEnabled", "extensionEnabled", "mode", "blockedCount"],
  (state) => {
    analyticsEnabled = state.analyticsEnabled === true;
    extensionEnabled = state.extensionEnabled !== false;
    currentMode = state.mode || "remove";
    removedCount = state.blockedCount || 0;

    if (analyticsEnabled) updateAnalyticsBanner();
    scanAndProcessTweets();
  }
);

// Observer for new tweets
const observer = new MutationObserver(() => scanAndProcessTweets());
observer.observe(document.body, { childList: true, subtree: true });

// Backup scan
setInterval(scanAndProcessTweets, 2000);

// Reset on URL change
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    removedCount = 0;
    updateAnalyticsBanner();
  }
}).observe(document, { subtree: true, childList: true });
