// ==============================
// PhobiaBlocker Content Script
// ==============================

let extensionEnabled = true;

// Detection patterns
const SNAKE_REGEX = /\b(snake|cobra|python|viper|boa|งู|anaconda|rattlesnake)\b|🐍/gi;

// Track processed tweets with their original state
const processedTweets = new WeakMap();

// ==============================
// Storage Change Listeners
// ==============================
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    if (changes.extensionEnabled) {
      extensionEnabled = changes.extensionEnabled.newValue;
      if (!extensionEnabled) {
        restoreAllTweets();
      } else {
        reprocessAllTweets();
      }
    }
  }
});

// ==============================
// Detection Logic
// ==============================
function shouldBlockTweet(article) {
  const text = article.innerText || article.textContent || "";
  return SNAKE_REGEX.test(text);
}

// ==============================
// Processing Modes (Remove Only)
// ==============================
function processTweet(article) {
  if (!extensionEnabled) return;
  if (!shouldBlockTweet(article)) return;

  // Store original state if not already stored
  if (!processedTweets.has(article)) {
    processedTweets.set(article, {
      originalDisplay: article.style.display,
      processed: true
    });
  }

  // Pure Remove Mode
  article.style.display = "none";
  article.dataset.phobiaHidden = "true";
}

// ==============================
// Restore Functions
// ==============================
function restoreAllTweets() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  tweets.forEach(tweet => {
    restoreTweet(tweet);
  });
}

function restoreTweet(tweet) {
  // Restore display
  const originalState = processedTweets.get(tweet);
  if (originalState) {
    tweet.style.display = originalState.originalDisplay || "";
  } else {
    tweet.style.display = "";
  }

  // Clear processing flags
  delete tweet.dataset.phobiaHidden;
  delete tweet.dataset.phobiaProcessed;

  processedTweets.delete(tweet);
}

function reprocessAllTweets() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');

  tweets.forEach(tweet => {
    // Clear processing state
    delete tweet.dataset.phobiaProcessed;

    // Restore first
    restoreTweet(tweet);

    // Then reprocess
    processTweet(tweet);
  });
}

// ==============================
// Scanning
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
// Initialization
// ==============================
function init() {
  chrome.storage.sync.get(["extensionEnabled"], (syncData) => {
    extensionEnabled = syncData.extensionEnabled !== false;

    // Initial scan
    scanAndProcessTweets();
  });
}

// Start extension
init();

// Watch for new tweets
const observer = new MutationObserver(() => {
  scanAndProcessTweets();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Periodic backup scan
setInterval(scanAndProcessTweets, 3000);

// Handle navigation
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(scanAndProcessTweets, 1000);
  }
}).observe(document, {
  subtree: true,
  childList: true
});