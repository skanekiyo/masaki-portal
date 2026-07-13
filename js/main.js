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

document.querySelectorAll(".music-item audio").forEach((audio) => {
  // 再生中は他の曲を止める
  audio.addEventListener("play", () => {
    document.querySelectorAll(".music-item audio").forEach((otherAudio) => {
      if (otherAudio !== audio) {
        otherAudio.pause();
      }
    });
  });

  // 携帯でも押しやすい大きな再生／停止ボタンを追加（標準プレーヤーは残す）
  const wrapper = document.createElement("div");
  wrapper.className = "music-player";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "music-play-toggle";
  toggle.setAttribute("aria-label", "再生");
  toggle.innerHTML =
    '<span class="music-play-icon" aria-hidden="true"></span>' +
    '<span class="music-play-label">再生</span>';

  audio.parentNode.insertBefore(wrapper, audio);
  wrapper.appendChild(toggle);
  wrapper.appendChild(audio);

  const label = toggle.querySelector(".music-play-label");
  const setState = (playing) => {
    toggle.classList.toggle("is-playing", playing);
    const text = playing ? "停止" : "再生";
    toggle.setAttribute("aria-label", text);
    label.textContent = text;
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
  audio.addEventListener("ended", () => setState(false));
});
