/*
 * Vanilla SplitText adapter for this buildless site.
 * Inspired by React Bits SplitText, Copyright (c) 2026 David Haz.
 * See THIRD_PARTY_NOTICES.txt for the upstream license.
 */
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isEmbedded = window.parent !== window;

  if (isEmbedded) {
    document.documentElement.classList.add("is-embedded");
    document.addEventListener("click", (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest(".chapter-link")
          : null;
      const href = target?.getAttribute("href");
      if (!href?.startsWith("#")) return;

      event.preventDefault();
      window.parent.postMessage(
        {
          type: "wedding-story-scroll-to",
          anchor: decodeURIComponent(href.slice(1)),
        },
        window.location.origin,
      );
    });
  }

  function splitText(element, options = {}) {
    const text = element.textContent.replace(/\s+/g, " ").trim();
    if (!text || reducedMotion.matches) return;

    const delay = Number(options.delay ?? 50);
    const duration = Number(options.duration ?? 0.78);
    const pieces = [];
    const fragment = document.createDocumentFragment();

    Array.from(text).forEach((character) => {
      const piece = document.createElement("span");
      piece.className = "split-text-piece";
      piece.setAttribute("aria-hidden", "true");
      piece.style.setProperty("--split-delay", `${pieces.length * delay}ms`);
      piece.style.setProperty("--split-duration", `${duration}s`);
      piece.textContent = character === " " ? "\u00a0" : character;
      pieces.push(piece);
      fragment.append(piece);
    });

    element.setAttribute("aria-label", text);
    element.classList.add("split-text");
    element.replaceChildren(fragment);

    requestAnimationFrame(() => {
      element.classList.add("split-text-ready");
    });
  }

  async function mount() {
    const target = document.querySelector("[data-split-text]");
    if (!target) return;

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    splitText(target, { delay: 50, duration: 0.78 });
  }

  function reportEmbedHeight() {
    if (!isEmbedded) return;

    let reportScheduled = false;
    const report = () => {
      if (reportScheduled) return;
      reportScheduled = true;

      requestAnimationFrame(() => {
        reportScheduled = false;
        const workspace = document.querySelector(".workspace");
        const contentHeight = workspace
          ? workspace.getBoundingClientRect().bottom + window.scrollY
          : Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
            );
        const height = Math.ceil(contentHeight);
        window.parent.postMessage(
          { type: "wedding-story-height", height },
          window.location.origin,
        );
      });
    };

    requestAnimationFrame(report);
    const observer = new ResizeObserver(report);
    const workspace = document.querySelector(".workspace");
    if (workspace) {
      observer.observe(workspace);
    } else {
      observer.observe(document.body);
    }
    window.addEventListener("load", report, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        reportEmbedHeight();
        void mount();
      },
      { once: true },
    );
  } else {
    reportEmbedHeight();
    void mount();
  }
})();
