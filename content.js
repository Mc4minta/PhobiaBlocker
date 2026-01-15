// ==============================
// PhobiaBlocker Content Script
// ==============================

let extensionEnabled = true;
let currentMode = "remove";

// Snake detection pattern (keywords + common emojis)
const SNAKE_REGEX = /\b(snake|cobra|python|viper|boa|งู)\b|🐍|🐍|🐍/i;

// UI Constants
const BANNER_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// ==============================
// Listen to popup changes
// ==============================
chrome.storage.onChanged.addListener((changes) => {
  if (changes.extensionEnabled) {
    extensionEnabled = changes.extensionEnabled.newValue;
    if (!extensionEnabled) {
      restoreAllTweets();
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
  ["extensionEnabled", "mode"],
  (state) => {
    extensionEnabled = state.extensionEnabled !== false;
    currentMode = state.mode || "remove";

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
  }
}).observe(document, { subtree: true, childList: true });