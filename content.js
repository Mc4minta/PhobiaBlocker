let extensionEnabled = true;
let removedCount = 0;

const SNAKE_KEYWORDS = /\b(snake)\b/i;
const processedTweets = new WeakMap();

// Load initial state
chrome.storage.sync.get({ extensionEnabled: true, blockedCount: 0 }, (state) => {
  extensionEnabled = state.extensionEnabled;
  removedCount = state.blockedCount;
  if (extensionEnabled) {
    scanAndProcessTweets();
  }
});

// Listen for state changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.extensionEnabled) {
    extensionEnabled = changes.extensionEnabled.newValue;
    if (extensionEnabled) {
      scanAndProcessTweets();
    } else {
      restoreAllTweets();
    }
  }
});

function shouldBlockTweet(article) {
  const text = article.innerText || "";
  const match = text.match(SNAKE_KEYWORDS);

  if (match) {
    console.log('🚫 PhobiaBlocker: Tweet blocked');
    console.log('Reason: Matched keyword "' + match[0] + '"');
    console.log('Tweet text:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    console.log('---');
    return true;
  }

  return false;
}

function processTweet(article) {
  if (!extensionEnabled || !shouldBlockTweet(article)) return;

  // Use dataset markers as requested in restore logic
  if (article.dataset.phobiaProcessed === "true") return;

  if (!processedTweets.has(article)) {
    processedTweets.set(article, {
      display: article.style.display,
      opacity: article.style.opacity,
      height: article.style.height,
      margin: article.style.margin,
      padding: article.style.padding
    });
  }

  article.style.opacity = "0";
  article.style.height = "0";
  article.style.margin = "0";
  article.style.padding = "0";
  article.style.pointerEvents = "none";

  article.dataset.phobiaProcessed = "true";
  article.dataset.phobiaHidden = "true";

  removedCount++;
  chrome.storage.sync.set({ blockedCount: removedCount });
}

// ==============================
// Restore logic (Smart)
// ==============================
function restoreAllTweets() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');

  tweets.forEach(tweet => {
    // Restore original styles if we have them
    const s = processedTweets.get(tweet);
    if (s) {
      tweet.style.opacity = s.opacity || "";
      tweet.style.height = s.height || "";
      tweet.style.margin = s.margin || "";
      tweet.style.padding = s.padding || "";
      tweet.style.display = s.display || "";
    } else {
      // Fallback to user's provided logic
      tweet.style.display = "";
    }

    tweet.style.pointerEvents = "";
    tweet.dataset.phobiaHidden = "false";
    delete tweet.dataset.phobiaProcessed;

    // Remove replace placeholders (future-proofing as per user snippet)
    tweet.querySelectorAll(".phobia-shield-placeholder").forEach(p => p.remove());
    tweet.querySelectorAll("img[data-phobia-replaced]").forEach(img => {
      img.style.visibility = "visible";
      delete img.dataset.phobiaReplaced;
    });
  });

  removedCount = 0;
  chrome.storage.sync.set({ blockedCount: 0 });
}

function scanAndProcessTweets() {
  if (!extensionEnabled) return;
  document.querySelectorAll('article[data-testid="tweet"]').forEach(processTweet);
}

// Initial scan
scanAndProcessTweets();

// Observe for new tweets
new MutationObserver(() => {
  if (extensionEnabled) {
    scanAndProcessTweets();
  }
}).observe(document.body, { childList: true, subtree: true });