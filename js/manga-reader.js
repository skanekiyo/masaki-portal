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

  let currentPage = 1;
  let totalPages = 0;

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

  // タッチ操作
  const stage = reader.querySelector(".manga-reader-stage");
  if (stage) {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    stage.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) {
          tracking = false;
          return;
        }
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        tracking = true;
      },
      { passive: true }
    );

    stage.addEventListener(
      "touchend",
      (event) => {
        if (!tracking) {
          return;
        }
        tracking = false;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        const threshold = 40;
        const moved = Math.max(Math.abs(deltaX), Math.abs(deltaY));

        // タップ（ほぼ移動なし）: 画面の半分で次／前を判定
        if (moved < threshold) {
          const rect = stage.getBoundingClientRect();
          if (tapNav === "vertical") {
            // 絵本: 上半分→次 / 下半分→前
            showPage(touch.clientY - rect.top < rect.height / 2 ? currentPage + 1 : currentPage - 1);
          } else if (tapNav === "horizontal") {
            // 漫画(右綴じ): 左半分→次 / 右半分→前
            showPage(touch.clientX - rect.left < rect.width / 2 ? currentPage + 1 : currentPage - 1);
          }
          return;
        }

        if (tapNav === "vertical") {
          // 絵本: 上スワイプ→次 / 下スワイプ→前（横スワイプも一応対応）
          if (Math.abs(deltaY) >= Math.abs(deltaX)) {
            showPage(deltaY < 0 ? currentPage + 1 : currentPage - 1);
          } else {
            showPage(deltaX > 0 ? currentPage + 1 : currentPage - 1);
          }
          return;
        }

        // 漫画など: 横スワイプ（右→次 / 左→前）
        if (Math.abs(deltaX) < Math.abs(deltaY)) {
          return;
        }
        showPage(deltaX > 0 ? currentPage + 1 : currentPage - 1);
      },
      { passive: true }
    );
  }

  init();
})();
