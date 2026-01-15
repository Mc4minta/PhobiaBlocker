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

  if (currentMode === "blur") {
    blurTweetMedia(article);
    article.dataset.phobiaHidden = "true";
  }

  removedCount++;
  updateAnalyticsBanner();
}

// ==============================
// Blur logic (IMAGE ONLY, Twitter-like)
// ==============================
function blurTweetMedia(article) {
  const media = article.querySelectorAll("img");

  media.forEach(img => {
    if (img.dataset.phobiaBlurred) return;

    img.dataset.phobiaBlurred = "true";

    // Find the real media container (Twitter nests deeply)
    const container = img.closest('div[role="presentation"], div');
    if (!container) return;

    container.style.position = "relative";
    container.style.overflow = "hidden";

    // Blur + dim image
    img.style.filter = "blur(18px) brightness(0.7)";
    img.style.transition = "filter 0.3s";

    // Overlay (dark, subtle)
    const overlay = document.createElement("div");
    overlay.className = "phobia-sensitive-overlay";

    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;
    `;

    // Label box (Twitter-style)
    const label = document.createElement("div");
    label.innerText = "Sensitive content";
    label.style.cssText = `
      padding: 6px 12px;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 13px;
      font-weight: 600;
      pointer-events: none;
    `;

    overlay.appendChild(label);

    overlay.addEventListener("click", () => {
      img.style.filter = "none";
      overlay.remove();
    });

    container.appendChild(overlay);
  });
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

    tweet.querySelectorAll("[data-phobia-blurred]").forEach(el => {
      el.style.filter = "none";
      delete el.dataset.phobiaBlurred;
    });

    tweet.querySelectorAll(".phobia-overlay").forEach(o => o.remove());
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
