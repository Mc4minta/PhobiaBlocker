let extensionEnabled = document.getElementById("enabled-toggle").checked;

const SNAKE_KEYWORDS = /\b(snake)\b/i;
const processedTweets = new WeakMap();

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

  if (!processedTweets.has(article)) {
    processedTweets.set(article, {
      height: article.style.height,
      margin: article.style.margin,
      padding: article.style.padding,
      opacity: article.style.opacity
    });
  }

  article.style.opacity = "0";
  article.style.height = "0";
  article.style.margin = "0";
  article.style.padding = "0";
  article.style.pointerEvents = "none";
}

function restoreTweet(tweet) {
  const s = processedTweets.get(tweet);
  if (!s) return;

  tweet.style.opacity = s.opacity || "";
  tweet.style.height = s.height || "";
  tweet.style.margin = s.margin || "";
  tweet.style.padding = s.padding || "";
  tweet.style.pointerEvents = "";

  processedTweets.delete(tweet);
}

function scanAndProcessTweets() {
  document.querySelectorAll('article[data-testid="tweet"]').forEach(processTweet);
}

scanAndProcessTweets();
new MutationObserver(scanAndProcessTweets).observe(document.body, { childList: true, subtree: true });