(function () {
  const reader = document.querySelector(".manga-reader");
  if (!reader) {
    return;
  }

  const basePath = reader.dataset.base || "";
  const prefix = reader.dataset.prefix || "page-";
  const extension = reader.dataset.ext || ".jpg";
  const padLength = Number(reader.dataset.pad || "3");
  const pageImage = reader.querySelector(".manga-reader-page");
  const pageStatus = reader.querySelector(".manga-reader-status");
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
    pageStatus.textContent = hasPages ? `${currentPage} / ${totalPages}` : "0 / 0";
  }

  function showPage(pageNumber) {
    if (totalPages === 0) {
      return;
    }

    currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
    pageImage.src = pagePath(currentPage);
    pageImage.alt = `${currentPage}ページ目`;
    updateControls();
  }

  function showEmptyState() {
    if (loadingMessage) {
      loadingMessage.hidden = false;
      loadingMessage.textContent = "漫画ページの画像を準備中です。";
    }
    pageImage.hidden = true;
    updateControls();
  }

  async function init() {
    totalPages = await detectTotalPages();

    if (totalPages === 0) {
      showEmptyState();
      return;
    }

    if (loadingMessage) {
      loadingMessage.hidden = true;
    }

    pageImage.hidden = false;
    showPage(1);
  }

  prevButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(currentPage - 1);
    });
  });

  nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(currentPage + 1);
    });
  });

  firstButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(1);
    });
  });

  lastButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(totalPages);
    });
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

  init();
})();
