// Minimal scroll-speed feed: modes + panic infinite scroll
(function () {
  let lastY = window.scrollY;
  let lastT = performance.now();

  const CALM_THRESHOLD = 0.3;  // px per ms
  const RUSH_THRESHOLD = 0.8;

  const body = document.body;
  const speedValueEl = document.getElementById("speed-value");
  const speedBarEl = document.getElementById("speed-bar");
  const speedCaptionEl = document.getElementById("speed-caption");
  const modePill = document.getElementById("mode-pill");
  const modeLabel = document.getElementById("mode-label");
  const feedEl = document.getElementById("feed");

  const posts = [
    {
      chip: "Slow Scroll",
      title: "Focus locks in",
      body: "Cards stay crisp when you linger.",
      type: "calm",
      tags: { calm: "Focus", neutral: "Steady", rush: "Too Slow" },
      comments: { full: "👀 still here; comments stay open.", emoji: "👀…" },
      likes: { calm: 2400, neutral: 1500, rush: 420 }
    },
    {
      chip: "Fast Flick",
      title: "Rushing past everything",
      body: "",
      type: "rushy",
      tags: { calm: "Pause?", neutral: "Skim", rush: "🔥 Trending" },
      comments: { full: "💨 comments collapse as you zip.", emoji: "💨💨" },
      likes: { calm: 420, neutral: 1100, rush: 2300 }
    },
    {
      chip: "Medium Pace",
      title: "Quick check-in",
      body: "Skim-speed keeps things balanced.",
      type: "balanced",
      tags: { calm: "In Focus", neutral: "Normal", rush: "Keep Moving" },
      comments: { full: "🙂 skimmable thread stays light.", emoji: "👉🙂👉" },
      likes: { calm: 1200, neutral: 1700, rush: 1350 }
    },
    {
      chip: "Hold to Read",
      title: "Slower = clearer",
      body: "Text sharpens when you stay.",
      type: "calm",
      tags: { calm: "Clear", neutral: "Readable", rush: "Skipping" },
      comments: { full: "🔍 extra context shows up.", emoji: "🔍…" },
      likes: { calm: 2600, neutral: 1500, rush: 580 }
    },
    {
      chip: "Scroll Signal",
      title: "Tags rewrite on pace",
      body: "Label swaps mirror your speed.",
      type: "balanced",
      tags: { calm: "Invite", neutral: "Live", rush: "Pushy" },
      comments: { full: "♻️ labels flip as you speed up.", emoji: "⚡️🌀" },
      likes: { calm: 1500, neutral: 1600, rush: 900 }
    },
    {
      chip: "Echo Post",
      title: "Feed leans into motion",
      body: "",
      type: "rushy",
      tags: { calm: "Soft", neutral: "Standard", rush: "Loud" },
      comments: { full: "📣 reactions get louder in rush.", emoji: "📣🔥" },
      likes: { calm: 600, neutral: 1200, rush: 2100 }
    },
    {
      chip: "Micro Update",
      title: "Small notes survive calm",
      body: "Short blips stay readable only when slowed.",
      type: "calm",
      tags: { calm: "Saved", neutral: "Blink", rush: "Gone" },
      comments: { full: "🧊 pace keeps it chill.", emoji: "🧊" },
      likes: { calm: 1700, neutral: 900, rush: 320 }
    },
    {
      chip: "Rush Push",
      title: "More posts appear early",
      body: "",
      type: "rushy",
      tags: { calm: "Wait", neutral: "Incoming", rush: "Overflow" },
      comments: { full: "🚨 panic loading spins up.", emoji: "🚨🚨" },
      likes: { calm: 480, neutral: 980, rush: 2400 }
    }
  ];

  const likeSuffixByMode = { calm: " soft", neutral: "", rush: " hot" };
  const captionByMode = {
    calm: "<span>Calm</span>",
    neutral: "<span>Neutral</span>",
    rush: "<span>Rush</span>"
  };

  const moodClassNames = ["mode-calm", "mode-neutral", "mode-rush"];

  let currentSpeed = 0;
  let currentMode = "neutral";
  let ticking = false;
  let nextPostIndex = 0;

  function formatLikes(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + "k" : String(num);
  }

  function createCard(post) {
    const card = document.createElement("article");
    card.className = "feed-card slide-in";
    card.dataset.tagCalm = post.tags.calm;
    card.dataset.tagNeutral = post.tags.neutral;
    card.dataset.tagRush = post.tags.rush;
    card.dataset.commentFull = post.comments.full;
    card.dataset.commentEmoji = post.comments.emoji;
    card.dataset.likesCalm = post.likes.calm;
    card.dataset.likesNeutral = post.likes.neutral;
    card.dataset.likesRush = post.likes.rush;

    card.innerHTML = `
      <div class="feed-chip">${post.chip}</div>
      <div class="likes-row">
        <span class="tag-label">${post.tags.neutral}</span>
        <span class="like-count" aria-label="like count">0</span>
      </div>
      <h3 class="feed-title">${post.title}</h3>
      <p class="feed-text">${post.body}</p>
      <div class="comment-block">
        <div class="comment-preview"></div>
        <div class="comment-emoji"></div>
      </div>
    `;

    applyModeToCard(card, currentMode);
    setTimeout(() => card.classList.remove("slide-in"), 400);
    return card;
  }

  function applyModeToCard(card, mode) {
    const tagLabel = card.querySelector(".tag-label");
    const likeCount = card.querySelector(".like-count");
    const commentPreview = card.querySelector(".comment-preview");
    const commentEmoji = card.querySelector(".comment-emoji");

    const tag = card.dataset["tag" + capitalize(mode)];
    tagLabel.textContent = tag;
    tagLabel.classList.toggle("rushy", mode === "rush");

    const likes = Number(card.dataset["likes" + capitalize(mode)]) || 0;
    likeCount.textContent = formatLikes(likes) + likeSuffixByMode[mode];

    commentPreview.textContent = card.dataset.commentFull;
    commentEmoji.textContent = card.dataset.commentEmoji;
    card.classList.toggle("comments-collapsed", mode === "rush");

    // subtle global visual change per mode
    card.style.opacity = mode === "rush" ? 0.9 : 1;
    card.style.filter = mode === "rush" ? "blur(0.12px) saturate(1.05)" : "none";
  }

  function renderBatch(count) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const post = posts[nextPostIndex % posts.length];
      fragment.appendChild(createCard(post));
      nextPostIndex++;
    }
    feedEl.appendChild(fragment);
  }

  function refreshAllCards(mode) {
    document.querySelectorAll(".feed-card").forEach((card) =>
      applyModeToCard(card, mode)
    );
  }

  function setMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;

    // update body class
    moodClassNames.forEach((name) => body.classList.remove(name));
    body.classList.add("mode-" + mode);

    // top pill + caption
    modePill.dataset.mode = mode;
    modeLabel.textContent =
      mode === "calm" ? "Calm" : mode === "rush" ? "Rush" : "Neutral";
    speedCaptionEl.innerHTML = captionByMode[mode];

    refreshAllCards(mode);
  }

  function maybeLoadMore() {
    // rush mode loads more, earlier
    const threshold = currentMode === "rush" ? 1200 : 360;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - threshold) {
      const batchSize = currentMode === "rush" ? 6 : 3;
      renderBatch(batchSize);
      refreshAllCards(currentMode);
    }
  }

  function updateUI() {
    ticking = false;

    const clamped = Math.min(currentSpeed, 2);
    const pct = (clamped / 2) * 100;
    speedBarEl.style.width = pct.toFixed(1) + "%";
    speedValueEl.textContent = currentSpeed.toFixed(2) + " px/ms";

    let mode = "neutral";
    if (currentSpeed < CALM_THRESHOLD) mode = "calm";
    else if (currentSpeed > RUSH_THRESHOLD) mode = "rush";

    setMode(mode);
    maybeLoadMore();
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // initial feed
  renderBatch(6);
  refreshAllCards(currentMode);
  speedCaptionEl.innerHTML = captionByMode[currentMode];

  window.addEventListener(
    "scroll",
    () => {
      const now = performance.now();
      const y = window.scrollY;
      const dt = now - lastT || 1;
      const dy = Math.abs(y - lastY);

      currentSpeed = dy / dt;
      lastY = y;
      lastT = now;

      if (!ticking) {
        requestAnimationFrame(updateUI);
        ticking = true;
      }
    },
    { passive: true }
  );
})();
