(function () {
  const STORAGE_KEY = "rsw-reactions-v1";

  const SPEED = {
    calmThreshold: 0.25,
    rushThreshold: 1.2,
    glitchThreshold: 1.6,
    panicTrigger: 1.8,
    smoothing: 0.3
  };

  const PANIC = {
    duration: 1600,
    scrollSpeed: 3.5,
    cooldown: 4000
  };

  const DOM = {
    body: document.body,
    speedValue: document.getElementById("speed-value"),
    speedBar: document.getElementById("speed-bar"),
    speedCaption: document.getElementById("speed-caption"),
    modePill: document.getElementById("mode-pill"),
    modeLabel: document.getElementById("mode-label"),
    feed: document.getElementById("feed"),
    enterFeed: document.getElementById("enter-feed"),
    composerForm: document.getElementById("composer-form"),
    composerTitle: document.getElementById("composer-title"),
    composerBody: document.getElementById("composer-body"),
    newReflectionBtn: document.getElementById("new-reflection-btn"),
    composerOverlay: document.getElementById("composer-overlay"),
    closeComposerBtn: document.getElementById("close-composer"),
    cancelComposerBtn: document.getElementById("cancel-composer")
  };

  const persisted = loadStoredData();

  const state = {
    lastY: window.scrollY,
    lastT: performance.now(),
    speed: 0,
    mode: "neutral",
    ticking: false,
    nextPostIndex: 0,
    panic: {
      active: false,
      start: 0,
      end: 0,
      cooldownUntil: 0
    },
    reactions: persisted.reactions,
    userPosts: persisted.userPosts
  };

  let currentMode = "neutral";
  const panicLoaderEl = createPanicLoader();

  const posts = [
    {
      chip: "Slow Scroll",
      title: "Focus locks in",
      body: "Cards stay crisp when you linger.",
      tags: { calm: "Focus", neutral: "Steady", rush: "Too Slow" },
      likes: { calm: 2400, neutral: 1500, rush: 420 }
    },
    {
      chip: "Fast Flick",
      title: "Rushing past everything",
      body: "",
      tags: { calm: "Pause?", neutral: "Skim", rush: "Trending" },
      likes: { calm: 420, neutral: 1100, rush: 2300 }
    },
    {
      chip: "Medium Pace",
      title: "Quick check-in",
      body: "Skim-speed keeps things balanced.",
      tags: { calm: "In Focus", neutral: "Normal", rush: "Keep Moving" },
      likes: { calm: 1200, neutral: 1700, rush: 1350 }
    },
    {
      chip: "Hold to Read",
      title: "Slower = clearer",
      body: "Text sharpens when you stay.",
      tags: { calm: "Clear", neutral: "Readable", rush: "Skipping" },
      likes: { calm: 2600, neutral: 1500, rush: 580 }
    },
    {
      chip: "Scroll Signal",
      title: "Tags rewrite on pace",
      body: "Label swaps mirror your speed.",
      tags: { calm: "Invite", neutral: "Live", rush: "Pushy" },
      likes: { calm: 1500, neutral: 1600, rush: 900 }
    },
    {
      chip: "Echo Post",
      title: "Feed leans into motion",
      body: "",
      tags: { calm: "Soft", neutral: "Standard", rush: "Loud" },
      likes: { calm: 600, neutral: 1200, rush: 2100 }
    },
    {
      chip: "Micro Update",
      title: "Small notes survive calm",
      body: "Short blips stay readable only when slowed.",
      tags: { calm: "Saved", neutral: "Blink", rush: "Gone" },
      likes: { calm: 1700, neutral: 900, rush: 320 }
    },
    {
      chip: "Rush Push",
      title: "More posts appear early",
      body: "",
      tags: { calm: "Wait", neutral: "Incoming", rush: "Overflow" },
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

  if (DOM.feed) {
    init();
  }

  // --- Setup & navigation ---
  function init() {
    wireLanding();
    setupComposer();
    renderUserPosts();
    renderBatch(6);
    refreshAllCards(state.mode);
    DOM.speedCaption.innerHTML = captionByMode[state.mode];
    setupScrollListener();
  }

  function wireLanding() {
    if (!DOM.enterFeed) return;
    DOM.enterFeed.addEventListener("click", () => {
      window.location.href = "feed.html";
    });
  }

  // --- Composer (user reflections) ---
  function setupComposer() {
    if (DOM.newReflectionBtn) DOM.newReflectionBtn.addEventListener("click", openComposer);
    if (DOM.closeComposerBtn) DOM.closeComposerBtn.addEventListener("click", closeComposer);
    if (DOM.cancelComposerBtn) DOM.cancelComposerBtn.addEventListener("click", closeComposer);
    if (DOM.composerOverlay) {
      DOM.composerOverlay.addEventListener("click", (e) => {
        if (e.target === DOM.composerOverlay) closeComposer();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeComposer();
    });
    if (DOM.composerForm) DOM.composerForm.addEventListener("submit", handleComposerSubmit);
  }

  function openComposer() {
    if (!DOM.composerOverlay) return;
    DOM.composerOverlay.classList.remove("hidden");
    document.body.classList.add("composer-open");
    const target = DOM.composerTitle || DOM.composerBody;
    if (target) target.focus();
  }

  function closeComposer() {
    if (!DOM.composerOverlay) return;
    DOM.composerOverlay.classList.add("hidden");
    document.body.classList.remove("composer-open");
    if (DOM.composerTitle) DOM.composerTitle.value = "";
    if (DOM.composerBody) DOM.composerBody.value = "";
  }

  function handleComposerSubmit(event) {
    event.preventDefault();
    const titleValue = DOM.composerTitle ? DOM.composerTitle.value.trim() : "";
    const bodyValue = (DOM.composerBody?.value || "").trim();
    if (!bodyValue) return;

    const postId = "user-" + Date.now() + "-" + Math.random().toString(16).slice(2, 6);
    const post = {
      postId,
      chip: "Visitor Reflection",
      title: titleValue || bodyValue.slice(0, 80),
      body: bodyValue,
      tags: { calm: "Reflection", neutral: "Reflection", rush: "Blur" }
    };

    state.userPosts.unshift(post);
    ensurePostState(postId);
    DOM.feed.prepend(createCard(post, postId));
    saveReactions();
    closeComposer();
  }

  function renderUserPosts() {
    if (!state.userPosts.length) return;
    const fragment = document.createDocumentFragment();
    state.userPosts.forEach((post) => {
      const postId = post.postId || "user-" + Math.random().toString(16).slice(2, 6);
      post.postId = postId;
      ensurePostState(postId);
      fragment.appendChild(createCard(post, postId));
    });
    DOM.feed.appendChild(fragment);
  }

  // --- Feed rendering ---
  function renderBatch(count) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const post = posts[state.nextPostIndex % posts.length];
      const postId = "post-" + state.nextPostIndex;
      ensurePostState(postId);
      fragment.appendChild(createCard(post, postId));
      state.nextPostIndex++;
    }
    DOM.feed.appendChild(fragment);
  }

  function createCard(post, postId) {
    const card = document.createElement("article");
    card.className = "feed-card slide-in";
    card.dataset.tagCalm = post.tags.calm;
    card.dataset.tagNeutral = post.tags.neutral;
    card.dataset.tagRush = post.tags.rush;
    card.dataset.postId = postId;

    card.innerHTML = `
      <div class="feed-chip">${post.chip}</div>
      <div class="card-top">
        <span class="tag-label">${post.tags.neutral}</span>
        <div class="actions">
          <button class="icon-btn like-btn" type="button" aria-pressed="false">
            <span class="like-icon">♡</span>
            <span class="btn-label">Like</span>
          </button>
          <span class="count like-count" aria-label="like count">0</span>
          <button class="icon-btn comment-btn" type="button">
            <span class="comment-icon">💬</span>
            <span class="btn-label">Comments</span>
          </button>
          <span class="count comment-count" aria-label="comment count">0</span>
        </div>
      </div>
      <h3 class="feed-title">${post.title}</h3>
      <p class="feed-text">${post.body}</p>
      <div class="comments-thread">
        <div class="comments-list"></div>
        <div class="comment-input-row">
          <input class="comment-input" type="text" placeholder="Add a thought…" />
          <button class="primary-btn comment-submit" type="button">Post</button>
        </div>
      </div>
    `;

    applyModeToCard(card, state.mode);
    wireCardInteractions(card, postId);
    renderCardInteractions(postId, card);
    setTimeout(() => card.classList.remove("slide-in"), 400);
    return card;
  }

  function wireCardInteractions(card, postId) {
    const likeBtn = card.querySelector(".like-btn");
    const commentBtn = card.querySelector(".comment-btn");
    const commentSubmit = card.querySelector(".comment-submit");
    const commentInput = card.querySelector(".comment-input");

    likeBtn.addEventListener("click", () => toggleLike(postId, likeBtn));
    commentBtn.addEventListener("click", () => toggleComments(postId, card));
    commentSubmit.addEventListener("click", () => handleInlineCommentSubmit(postId, card));
    commentInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleInlineCommentSubmit(postId, card);
      }
    });
  }

  function renderCardInteractions(
    postId,
    card = document.querySelector(`.feed-card[data-post-id="${postId}"]`)
  ) {
    if (!card) return;
    const likeBtn = card.querySelector(".like-btn");
    const likeCount = card.querySelector(".like-count");
    const commentCount = card.querySelector(".comment-count");
    const thread = card.querySelector(".comments-thread");
    const listEl = card.querySelector(".comments-list");
    const data = ensurePostState(postId);

    likeCount.textContent = formatLikes(data.likes) + likeSuffixByMode[currentMode];
    commentCount.textContent = data.comments.length;
    likeBtn.classList.toggle("active", data.liked);
    likeBtn.setAttribute("aria-pressed", data.liked ? "true" : "false");

    if (thread && thread.classList.contains("open")) {
      renderInlineComments(postId, listEl);
    }
  }

  // --- Likes ---
  function toggleLike(postId, button) {
    const data = ensurePostState(postId);
    data.liked = !data.liked;
    data.likes = Math.max(0, data.likes + (data.liked ? 1 : -1));
    saveReactions();
    renderCardInteractions(postId);
    animateLike(button);
  }

  function animateLike(button) {
    const className = currentMode === "rush" ? "like-shake" : "like-pop";
    button.classList.remove("like-pop", "like-shake");
    void button.offsetWidth;
    button.classList.add(className);
  }

  // --- Comments ---
  function toggleComments(postId, card) {
    const thread = card.querySelector(".comments-thread");
    const listEl = card.querySelector(".comments-list");
    const toggleBtn = card.querySelector(".comment-btn");
    const isOpen = thread.classList.toggle("open");
    if (toggleBtn) toggleBtn.classList.toggle("active", isOpen);
    if (isOpen) {
      renderInlineComments(postId, listEl);
      const input = card.querySelector(".comment-input");
      input.focus();
    }
  }

  function renderInlineComments(postId, listEl) {
    const data = ensurePostState(postId);
    listEl.innerHTML = "";
    data.comments.forEach((text) => {
      const div = document.createElement("div");
      div.className = "comment-item";
      div.textContent = text;
      listEl.appendChild(div);
    });
  }

  function handleInlineCommentSubmit(postId, card) {
    const input = card.querySelector(".comment-input");
    const listEl = card.querySelector(".comments-list");
    const value = input.value.trim();
    if (!value) return;
    const data = ensurePostState(postId);
    data.comments.push(value);
    saveReactions();
    renderInlineComments(postId, listEl);
    input.value = "";
    renderCardInteractions(postId, card);
  }

  // --- Scroll, mode, and panic ---
  function applyModeToCard(card, mode) {
    const tagLabel = card.querySelector(".tag-label");
    const tag = card.dataset["tag" + capitalize(mode)];
    tagLabel.textContent = tag;
    tagLabel.classList.toggle("rushy", mode === "rush");

    card.style.opacity = mode === "rush" ? 0.96 : 1;
    card.style.filter = mode === "rush" ? "saturate(1.05)" : "none";
    card.classList.remove("glitchy");
  }

  function refreshAllCards(mode) {
    document.querySelectorAll(".feed-card").forEach((card) => {
      applyModeToCard(card, mode);
      renderCardInteractions(card.dataset.postId, card);
    });
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;
    currentMode = mode;

    moodClassNames.forEach((name) => DOM.body.classList.remove(name));
    DOM.body.classList.add("mode-" + mode);
    DOM.modePill.dataset.mode = mode;
    DOM.modeLabel.textContent = mode === "calm" ? "Calm" : mode === "rush" ? "Rush" : "Neutral";
    DOM.speedCaption.innerHTML = captionByMode[mode];

    if (!state.panic.active) {
      panicLoaderEl.classList.toggle("visible", mode === "rush");
    }

    refreshAllCards(mode);
  }

  function setupScrollListener() {
    window.addEventListener(
      "scroll",
      () => {
        if (state.panic.active) {
          state.lastY = window.scrollY;
          state.lastT = performance.now();
          return;
        }

        const now = performance.now();
        const y = window.scrollY;
        const dt = now - state.lastT || 1;
        const dy = Math.abs(y - state.lastY);
        const instantSpeed = dy / dt;

        state.speed = state.speed * (1 - SPEED.smoothing) + instantSpeed * SPEED.smoothing;
        state.lastY = y;
        state.lastT = now;

        if (!state.ticking) {
          requestAnimationFrame(updateUI);
          state.ticking = true;
        }
      },
      { passive: true }
    );
  }

  function updateUI() {
    state.ticking = false;
    if (state.panic.active) {
      setSpeedUI("MAX", 100, "<span>Overload</span>");
      return;
    }

    const pct = clampPercent(state.speed);
    setSpeedUI(state.speed.toFixed(2) + " px/ms", pct, captionByMode[state.mode]);

    const nextMode = computeMode(state.speed, state.mode);
    setMode(nextMode);

    const glitchOn = state.speed > SPEED.glitchThreshold && state.mode === "rush";
    toggleGlitch(glitchOn);

    if (!state.panic.active && state.speed > SPEED.panicTrigger && state.mode === "rush") {
      startPanic();
      return;
    }

    maybeLoadMore();
  }

  function clampPercent(speed) {
    const clamped = Math.min(speed, 2);
    return ((clamped / 2) * 100).toFixed(1);
  }

  function setSpeedUI(text, percent, captionHtml) {
    DOM.speedBar.style.width = percent + "%";
    DOM.speedValue.textContent = text;
    DOM.speedCaption.innerHTML = captionHtml;
  }

  function computeMode(speed, current) {
    let mode = current;
    if (mode === "neutral") {
      if (speed < SPEED.calmThreshold) mode = "calm";
      else if (speed > SPEED.rushThreshold) mode = "rush";
    } else if (mode === "calm") {
      if (speed > SPEED.calmThreshold * 1.4) mode = "neutral";
    } else if (mode === "rush") {
      if (speed < SPEED.rushThreshold * 0.7) mode = "neutral";
    }
    return mode;
  }

  function toggleGlitch(on) {
    document.querySelectorAll(".feed-card").forEach((card) => {
      card.classList.toggle("glitchy", on);
    });
  }

  function maybeLoadMore() {
    const threshold = state.mode === "rush" ? 1200 : 360;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - threshold) {
      const batchSize = state.mode === "rush" ? 6 : 3;
      renderBatch(batchSize);
      refreshAllCards(state.mode);
      if (state.mode === "rush" && !state.panic.active) {
        panicLoaderEl.classList.add("visible");
        setTimeout(() => panicLoaderEl.classList.remove("visible"), 700);
      }
    }
  }

  function scrambleCards(intensity = 1) {
    const cards = document.querySelectorAll(".feed-card");
    cards.forEach((card) => {
      const angle = (Math.random() - 0.5) * 60 * intensity;
      const offsetX = (Math.random() - 0.5) * 360 * intensity;
      const offsetY = (Math.random() - 0.5) * 240 * intensity;
      const scale = 1 + (Math.random() - 0.5) * 0.5 * intensity;
      card.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${angle}deg) scale(${scale})`;
      card.style.zIndex = 50 + Math.floor(Math.random() * 100);
      card.style.opacity = 0.2 + Math.random() * 0.4;
      card.style.filter = "contrast(1.2) grayscale(0.2)";
    });
  }

  function startPanic() {
    const now = performance.now();
    if (state.panic.active || now < state.panic.cooldownUntil) return;

    state.panic.active = true;
    state.panic.start = now;
    state.panic.end = now + PANIC.duration;
    state.panic.cooldownUntil = state.panic.end + PANIC.cooldown;

    DOM.body.classList.add("panic");
    panicLoaderEl.classList.add("visible");
    setSpeedUI("MAX", 100, "<span>Overload</span>");
    panicLoop();
  }

  function endPanic() {
    state.panic.active = false;
    DOM.body.classList.remove("panic");
    panicLoaderEl.classList.remove("visible");
    state.speed = 0;
    document.querySelectorAll(".feed-card").forEach(resetCardStyles);
  }

  function panicLoop() {
    if (!state.panic.active) return;
    const now = performance.now();
    if (now >= state.panic.end) {
      endPanic();
      return;
    }

    let t = (now - state.panic.start) / PANIC.duration;
    t = Math.max(0, Math.min(1, t));
    const intensity = Math.sin(Math.PI * t);

    scrambleCards(intensity);
    const nextY = window.scrollY + PANIC.scrollSpeed * 16;
    window.scrollTo(0, nextY);
    maybeLoadMore();
    requestAnimationFrame(panicLoop);
  }

  // --- Helpers & persistence ---
  function createPanicLoader() {
    const div = document.createElement("div");
    div.id = "panic-loader";
    div.textContent = "⚡ Panic loading…";
    document.body.appendChild(div);
    return div;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function resetCardStyles(card) {
    card.style.transform = "";
    card.style.zIndex = "";
    card.style.opacity = "";
    card.style.filter = "";
  }

  function formatLikes(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + "k" : String(num);
  }

  function randomLikes() {
    return Math.floor(Math.random() * 121);
  }

  function ensurePostState(postId) {
    if (!state.reactions[postId]) {
      state.reactions[postId] = { likes: randomLikes(), liked: false, comments: [] };
    }
    return state.reactions[postId];
  }

  function loadStoredData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { reactions: {}, userPosts: [] };

      const parsed = JSON.parse(raw);
      const reactions = parsed.reactions || parsed || {};
      const cleanedReactions = Object.keys(reactions).reduce((acc, key) => {
        const entry = reactions[key] || {};
        acc[key] = { ...entry, comments: [] };
        return acc;
      }, {});

      return { reactions: cleanedReactions, userPosts: parsed.userPosts || [] };
    } catch (err) {
      console.warn("Failed to load reactions", err);
      return { reactions: {}, userPosts: [] };
    }
  }

  function saveReactions() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ reactions: state.reactions, userPosts: state.userPosts })
      );
    } catch (err) {
      console.warn("Failed to save reactions", err);
    }
  }
})();
