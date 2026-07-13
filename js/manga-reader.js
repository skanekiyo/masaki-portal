(function () {
  const reader = document.querySelector(".manga-reader");
  if (!reader) {
    return;
  }

  const basePath = reader.dataset.base || "";
  const prefix = reader.dataset.prefix || "page-";
  const extension = reader.dataset.ext || ".jpg";
  const padLength = Number(reader.dataset.pad || "3");
  const declaredCount = Number(reader.dataset.count || "0");
  const tapNav = reader.dataset.tapNav || ""; // "vertical"（絵本）/ "horizontal"（漫画）/ 無し

  const pageImage = reader.querySelector(".manga-reader-page");
  const pageStatuses = reader.querySelectorAll(".manga-reader-status");
  const prevButtons = reader.querySelectorAll(".manga-reader-prev");
  const nextButtons = reader.querySelectorAll(".manga-reader-next");
  const firstButtons = reader.querySelectorAll(".manga-reader-first");
  const lastButtons = reader.querySelectorAll(".manga-reader-last");
  const loadingMessage = reader.querySelector(".manga-reader-loading");
  const stage = reader.querySelector(".manga-reader-stage");

  let currentPage = 1;
  let totalPages = 0;

  // ===== 拡大（ズーム）／移動（パン）状態 =====
  const zoomMedia = window.matchMedia("(max-width: 860px) and (orientation: portrait)");
  const rotated = reader.classList.contains("manga-reader--rotate");
  const minScale = 1;
  const maxScale = 4;
  let scale = 1;
  let tx = 0;
  let ty = 0;

  function clamp(value, low, high) {
    return Math.min(Math.max(value, low), high);
  }

  function applyTransform() {
    if (zoomMedia.matches) {
      pageImage.style.transform =
        "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")" +
        (rotated ? " rotate(90deg)" : "");
    } else {
      pageImage.style.transform = "";
    }
  }

  function resetZoom() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  function clampPan() {
    if (!stage) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    const maxX = (rect.width * (scale - 1)) / 2 + 30;
    const maxY = (rect.height * (scale - 1)) / 2 + 30;
    tx = clamp(tx, -maxX, maxX);
    ty = clamp(ty, -maxY, maxY);
  }

  function pagePath(pageNumber) {
    const padded = String(pageNumber).padStart(padLength, "0");
    return `${basePath}${prefix}${padded}${extension}`;
  }

  function tryLoadImage(url) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = url;
    });
  }

  async function detectTotalPages() {
    let pageNumber = 1;
    while (pageNumber <= 500) {
      const exists = await tryLoadImage(pagePath(pageNumber));
      if (!exists) {
        break;
      }
      pageNumber += 1;
    }
    return pageNumber - 1;
  }

  // 前後ページだけを先読みしてめくりを速くする（全ページは読み込まない）
  function preloadPage(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      const image = new Image();
      image.src = pagePath(pageNumber);
    }
  }

  function updateControls() {
    const hasPages = totalPages > 0;
    prevButtons.forEach((button) => {
      button.disabled = !hasPages || currentPage <= 1;
    });
    nextButtons.forEach((button) => {
      button.disabled = !hasPages || currentPage >= totalPages;
    });
    firstButtons.forEach((button) => {
      button.disabled = !hasPages || currentPage <= 1;
    });
    lastButtons.forEach((button) => {
      button.disabled = !hasPages || currentPage >= totalPages;
    });
    pageStatuses.forEach((element) => {
      element.textContent = hasPages ? `${currentPage} / ${totalPages}` : "0 / 0";
    });
  }

  function showPage(pageNumber) {
    if (totalPages === 0) {
      return;
    }
    currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
    pageImage.src = pagePath(currentPage);
    pageImage.alt = `${currentPage}ページ目`;
    resetZoom(); // ページを変えたら拡大を解除
    updateControls();
    preloadPage(currentPage + 1);
    preloadPage(currentPage - 1);
  }

  function showEmptyState() {
    if (loadingMessage) {
      loadingMessage.hidden = false;
      loadingMessage.textContent = "ページの画像を準備中です。";
    }
    pageImage.hidden = true;
    updateControls();
  }

  async function init() {
    if (declaredCount > 0) {
      // ページ数が指定済み → 数え上げを待たずに即座に1ページ目を表示
      totalPages = declaredCount;
      if (loadingMessage) {
        loadingMessage.hidden = true;
      }
      pageImage.hidden = false;
      showPage(1);
      return;
    }

    // フォールバック: まず1ページ目を表示し、総ページ数は裏で数える
    const firstExists = await tryLoadImage(pagePath(1));
    if (!firstExists) {
      showEmptyState();
      return;
    }
    totalPages = 1;
    if (loadingMessage) {
      loadingMessage.hidden = true;
    }
    pageImage.hidden = false;
    showPage(1);
    totalPages = await detectTotalPages();
    updateControls();
    preloadPage(currentPage + 1);
  }

  prevButtons.forEach((button) => {
    button.addEventListener("click", () => showPage(currentPage - 1));
  });
  nextButtons.forEach((button) => {
    button.addEventListener("click", () => showPage(currentPage + 1));
  });
  firstButtons.forEach((button) => {
    button.addEventListener("click", () => showPage(1));
  });
  lastButtons.forEach((button) => {
    button.addEventListener("click", () => showPage(totalPages));
  });

  reader.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const action = target.dataset.action;
    if (action === "prev") {
      showPage(currentPage - 1);
    }
    if (action === "next") {
      showPage(currentPage + 1);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      showPage(currentPage - 1);
    }
    if (event.key === "ArrowRight") {
      showPage(currentPage + 1);
    }
  });

  // 画面の向き・幅が変わったら拡大を解除して表示を作り直す
  if (zoomMedia.addEventListener) {
    zoomMedia.addEventListener("change", resetZoom);
  } else if (zoomMedia.addListener) {
    zoomMedia.addListener(resetZoom);
  }

  // ===== タッチ操作（ピンチ拡大・パン・ダブルタップ解除・ページめくり） =====
  if (stage) {
    let mode = null; // "pinch" | "pan" | "nav"
    let startX = 0;
    let startY = 0;
    let startTx = 0;
    let startTy = 0;
    let pinchDist = 0;
    let pinchScale = 1;
    let lastTap = 0;

    function distance(a, b) {
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function beginSingle(touch) {
      startX = touch.clientX;
      startY = touch.clientY;
      startTx = tx;
      startTy = ty;
      mode = scale > 1 ? "pan" : "nav";
    }

    stage.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length >= 2) {
          mode = "pinch";
          pinchDist = distance(event.touches[0], event.touches[1]);
          pinchScale = scale;
        } else if (event.touches.length === 1) {
          beginSingle(event.touches[0]);
        }
      },
      { passive: true }
    );

    stage.addEventListener(
      "touchmove",
      (event) => {
        if (mode === "pinch" && event.touches.length >= 2) {
          const d = distance(event.touches[0], event.touches[1]);
          if (pinchDist > 0) {
            scale = clamp(pinchScale * (d / pinchDist), minScale, maxScale);
            clampPan();
            applyTransform();
          }
        } else if (mode === "pan" && event.touches.length === 1) {
          const touch = event.touches[0];
          tx = startTx + (touch.clientX - startX);
          ty = startTy + (touch.clientY - startY);
          clampPan();
          applyTransform();
        }
      },
      { passive: true }
    );

    stage.addEventListener(
      "touchend",
      (event) => {
        if (mode === "pinch") {
          if (scale <= 1.03) {
            resetZoom();
          }
          // 指が1本残っていれば続けてパン/ナビへ
          if (event.touches.length === 1) {
            beginSingle(event.touches[0]);
          } else {
            mode = null;
          }
          return;
        }

        if (mode === "pan") {
          // 拡大中の1本指: ほぼ動いていなければダブルタップ判定
          const touch = event.changedTouches[0];
          const moved = Math.max(
            Math.abs(touch.clientX - startX),
            Math.abs(touch.clientY - startY)
          );
          if (moved < 12) {
            const now = Date.now();
            if (now - lastTap < 300) {
              resetZoom(); // ダブルタップ → 等倍に戻す
              lastTap = 0;
            } else {
              lastTap = now;
            }
          }
          mode = null;
          return;
        }

        if (mode === "nav") {
          // 等倍時: タップ/スワイプでページ移動
          const touch = event.changedTouches[0];
          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;
          const threshold = 40;
          const moved = Math.max(Math.abs(deltaX), Math.abs(deltaY));

          if (moved < threshold) {
            const rect = stage.getBoundingClientRect();
            if (tapNav === "vertical") {
              showPage(touch.clientY - rect.top < rect.height / 2 ? currentPage + 1 : currentPage - 1);
            } else if (tapNav === "horizontal") {
              showPage(touch.clientX - rect.left < rect.width / 2 ? currentPage + 1 : currentPage - 1);
            }
          } else if (tapNav === "vertical") {
            if (Math.abs(deltaY) >= Math.abs(deltaX)) {
              showPage(deltaY < 0 ? currentPage + 1 : currentPage - 1);
            } else {
              showPage(deltaX > 0 ? currentPage + 1 : currentPage - 1);
            }
          } else if (Math.abs(deltaX) >= Math.abs(deltaY)) {
            showPage(deltaX > 0 ? currentPage + 1 : currentPage - 1);
          }
          mode = null;
          return;
        }
      },
      { passive: true }
    );
  }

  init();
})();
