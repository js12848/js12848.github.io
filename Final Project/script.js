(function () {
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
    feed: document.getElementById("feed")
  };

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
    }
  };

  const panicLoaderEl = createPanicLoader();

  const posts = [
    {
      chip: "Slow Scroll",
      title: "Focus locks in",
      body: "Cards stay crisp when you linger.",
      type: "calm",
      tags: { calm: "Focus", neutral: "Steady", rush: "Too Slow" },
      comments: {
        full: "Still here; comments stay open when you slow down.",
        emoji: ""
      },
      likes: { calm: 2400, neutral: 1500, rush: 420 }
    },
    {
      chip: "Fast Flick",
      title: "Rushing past everything",
      body: "",
      type: "rushy",
      tags: { calm: "Pause?", neutral: "Skim", rush: "Trending" },
      comments: {
        full: "Comments collapse as you zip past the feed.",
        emoji: ""
      },
      likes: { calm: 420, neutral: 1100, rush: 2300 }
    },
    {
      chip: "Medium Pace",
      title: "Quick check-in",
      body: "Skim-speed keeps things balanced.",
      type: "balanced",
      tags: { calm: "In Focus", neutral: "Normal", rush: "Keep Moving" },
      comments: {
        full: "A skimmable thread stays light at this pace.",
        emoji: ""
      },
      likes: { calm: 1200, neutral: 1700, rush: 1350 }
    },
    {
      chip: "Hold to Read",
      title: "Slower = clearer",
      body: "Text sharpens when you stay.",
      type: "calm",
      tags: { calm: "Clear", neutral: "Readable", rush: "Skipping" },
      comments: {
        full: "Extra context shows up when you slow down.",
        emoji: ""
      },
      likes: { calm: 2600, neutral: 1500, rush: 580 }
    },
    {
      chip: "Scroll Signal",
      title: "Tags rewrite on pace",
      body: "Label swaps mirror your speed.",
      type: "balanced",
      tags: { calm: "Invite", neutral: "Live", rush: "Pushy" },
      comments: {
        full: "Labels flip as you speed up or slow down.",
        emoji: ""
      },
      likes: { calm: 1500, neutral: 1600, rush: 900 }
    },
    {
      chip: "Echo Post",
      title: "Feed leans into motion",
      body: "",
      type: "rushy",
      tags: { calm: "Soft", neutral: "Standard", rush: "Loud" },
      comments: {
        full: "Reactions get louder the faster you move.",
        emoji: ""
      },
      likes: { calm: 600, neutral: 1200, rush: 2100 }
    },
    {
      chip: "Micro Update",
      title: "Small notes survive calm",
      body: "Short blips stay readable only when slowed.",
      type: "calm",
      tags: { calm: "Saved", neutral: "Blink", rush: "Gone" },
      comments: {
        full: "A slower pace keeps small details visible.",
        emoji: ""
      },
      likes: { calm: 1700, neutral: 900, rush: 320 }
    },
    {
      chip: "Rush Push",
      title: "More posts appear early",
      body: "",
      type: "rushy",
      tags: { calm: "Wait", neutral: "Incoming", rush: "Overflow" },
      comments: {
        full: "Panic loading spins up as you rush.",
        emoji: ""
      },
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

  function formatLikes(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + "k" : String(num);
  }

  function createPanicLoader() {
    const div = document.createElement("div");
    div.id = "panic-loader";
    div.textContent = "⚡ Panic loading…";
    document.body.appendChild(div);
    return div;
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

    applyModeToCard(card, state.mode);
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

    card.style.opacity = mode === "rush" ? 0.96 : 1;
    card.style.filter = mode === "rush" ? "saturate(1.05)" : "none";
    card.classList.remove("glitchy");
  }

  function renderBatch(count) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const post = posts[state.nextPostIndex % posts.length];
      fragment.appendChild(createCard(post));
      state.nextPostIndex++;
    }
    DOM.feed.appendChild(fragment);
  }

  function refreshAllCards(mode) {
    document.querySelectorAll(".feed-card").forEach((card) =>
      applyModeToCard(card, mode)
    );
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;

    moodClassNames.forEach((name) => DOM.body.classList.remove(name));
    DOM.body.classList.add("mode-" + mode);

    DOM.modePill.dataset.mode = mode;
    DOM.modeLabel.textContent =
      mode === "calm" ? "Calm" : mode === "rush" ? "Rush" : "Neutral";
    DOM.speedCaption.innerHTML = captionByMode[mode];

    if (!state.panic.active) {
      panicLoaderEl.classList.toggle("visible", mode === "rush");
    }

    refreshAllCards(mode);
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

    if (state.panic.active) return;
    if (now < state.panic.cooldownUntil) return;

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

    const glitchOn =
      state.speed > SPEED.glitchThreshold && state.mode === "rush";
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

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function resetCardStyles(card) {
    card.style.transform = "";
    card.style.zIndex = "";
    card.style.opacity = "";
    card.style.filter = "";
  }

  renderBatch(6);
  refreshAllCards(state.mode);
  DOM.speedCaption.innerHTML = captionByMode[state.mode];

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

      state.speed =
        state.speed * (1 - SPEED.smoothing) + instantSpeed * SPEED.smoothing;

      state.lastY = y;
      state.lastT = now;

      if (!state.ticking) {
        requestAnimationFrame(updateUI);
        state.ticking = true;
      }
    },
    { passive: true }
  );
})();
