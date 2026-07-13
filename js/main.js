const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const currentYear = document.querySelector("#current-year");

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return minutes + ":" + String(secs).padStart(2, "0");
}

document.querySelectorAll(".music-item audio").forEach((audio) => {
  // 再生中は他の曲を止める
  audio.addEventListener("play", () => {
    document.querySelectorAll(".music-item audio").forEach((otherAudio) => {
      if (otherAudio !== audio) {
        otherAudio.pause();
      }
    });
  });

  // 標準プレーヤーを、押しやすい丸ボタン＋進行バー付きの独自プレーヤーに置き換える
  audio.removeAttribute("controls");
  audio.preload = "metadata";

  const wrapper = document.createElement("div");
  wrapper.className = "music-player";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "music-play-toggle";
  toggle.setAttribute("aria-label", "再生");
  toggle.innerHTML = '<span class="music-play-icon" aria-hidden="true"></span>';

  const progress = document.createElement("div");
  progress.className = "music-progress";

  const bar = document.createElement("div");
  bar.className = "music-progress-bar";
  bar.setAttribute("role", "slider");
  bar.setAttribute("aria-label", "再生位置");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuenow", "0");
  bar.tabIndex = 0;

  const fill = document.createElement("div");
  fill.className = "music-progress-fill";
  bar.appendChild(fill);

  const time = document.createElement("div");
  time.className = "music-time";
  const currentEl = document.createElement("span");
  currentEl.textContent = "0:00";
  const durationEl = document.createElement("span");
  durationEl.textContent = "0:00";
  time.appendChild(currentEl);
  time.appendChild(document.createTextNode(" / "));
  time.appendChild(durationEl);

  progress.appendChild(bar);
  progress.appendChild(time);

  audio.parentNode.insertBefore(wrapper, audio);
  wrapper.appendChild(toggle);
  wrapper.appendChild(progress);
  wrapper.appendChild(audio);

  const setState = (playing) => {
    toggle.classList.toggle("is-playing", playing);
    toggle.setAttribute("aria-label", playing ? "停止" : "再生");
  };

  toggle.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", () => setState(true));
  audio.addEventListener("pause", () => setState(false));
  audio.addEventListener("ended", () => {
    setState(false);
    fill.style.width = "0%";
    currentEl.textContent = "0:00";
    bar.setAttribute("aria-valuenow", "0");
  });

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
    bar.setAttribute("aria-valuemax", String(Math.floor(audio.duration || 0)));
  });

  audio.addEventListener("timeupdate", () => {
    const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
    fill.style.width = ratio * 100 + "%";
    currentEl.textContent = formatTime(audio.currentTime);
    bar.setAttribute("aria-valuenow", String(Math.floor(audio.currentTime)));
  });

  const seekTo = (clientX) => {
    if (!isFinite(audio.duration)) {
      return;
    }
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
  };

  bar.addEventListener("click", (event) => seekTo(event.clientX));

  bar.addEventListener("keydown", (event) => {
    if (!isFinite(audio.duration)) {
      return;
    }
    if (event.key === "ArrowRight") {
      audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
      event.preventDefault();
    }
    if (event.key === "ArrowLeft") {
      audio.currentTime = Math.max(audio.currentTime - 5, 0);
      event.preventDefault();
    }
  });
});
