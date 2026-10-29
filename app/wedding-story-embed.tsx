"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_FRAME_HEIGHT = 960;
const FRAME_SOURCE = "/wedding-story/index.html?v=20261029-7";

export function WeddingStoryEmbed() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const frameResizeCleanupRef = useRef<(() => void) | null>(null);
  const [height, setHeight] = useState(MIN_FRAME_HEIGHT);

  const syncHeight = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const docElement = doc?.documentElement;
    if (!frame || !doc || !docElement) return;

    const workspace = doc.querySelector<HTMLElement>(".workspace");
    const frameWindow = doc.defaultView;
    const contentHeight = workspace
      ? Math.ceil(
          workspace.getBoundingClientRect().bottom +
            (frameWindow?.scrollY ?? 0),
        )
      : Math.max(
          docElement.scrollHeight,
          doc.body?.scrollHeight ?? 0,
        );
    const nextHeight = Math.max(MIN_FRAME_HEIGHT, contentHeight);
    const roundedHeight = Math.ceil(nextHeight);
    setHeight((currentHeight) =>
      currentHeight === roundedHeight ? currentHeight : roundedHeight,
    );
  }, []);

  const bindFrame = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const docElement = doc?.documentElement;
    if (!frame || !doc || !docElement) return;

    observerRef.current?.disconnect();
    frameResizeCleanupRef.current?.();
    syncHeight();

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(syncHeight);
    });
    const workspace = doc.querySelector(".workspace");
    if (workspace) {
      observer.observe(workspace);
    } else {
      observer.observe(docElement);
    }
    observerRef.current = observer;

    const frameWindow = frame.contentWindow;
    frameWindow?.addEventListener("resize", syncHeight);
    frameResizeCleanupRef.current = () =>
      frameWindow?.removeEventListener("resize", syncHeight);
  }, [syncHeight]);

  useEffect(() => {
    const handleWindowResize = () => syncHeight();
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      ) {
        return;
      }

      if (event.data?.type === "wedding-story-height") {
        const nextHeight = Number(event.data.height);
        if (Number.isFinite(nextHeight) && nextHeight > 0) {
          setHeight(Math.max(MIN_FRAME_HEIGHT, Math.ceil(nextHeight)));
        }
        return;
      }

      if (event.data?.type === "wedding-story-scroll-to") {
        const anchor = String(event.data.anchor ?? "");
        const frame = frameRef.current;
        const target = frame?.contentDocument?.getElementById(anchor);
        if (!frame || !target) return;

        const childScrollY = frame.contentWindow?.scrollY ?? 0;
        const targetTop =
          window.scrollY +
          frame.getBoundingClientRect().top +
          target.getBoundingClientRect().top +
          childScrollY -
          16;

        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }
    };

    window.addEventListener("resize", handleWindowResize);
    window.addEventListener("message", handleMessage);

    // A cached iframe can finish loading before React attaches onLoad.
    // Rebind after hydration so its existing document is measured as well.
    const bindTimers = [0, 120, 500, 1200, 2400].map((delay) =>
      window.setTimeout(bindFrame, delay),
    );

    return () => {
      bindTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("message", handleMessage);
      observerRef.current?.disconnect();
      frameResizeCleanupRef.current?.();
    };
  }, [bindFrame, syncHeight]);

  return (
    <section
      className="wedding-story-embed"
      id="wedding-story"
      aria-label="婚礼故事采集"
    >
      <iframe
        ref={frameRef}
        src={FRAME_SOURCE}
        title="婚礼故事采集卡"
        scrolling="no"
        allow="clipboard-write"
        style={{ height }}
        onLoad={bindFrame}
      />
    </section>
  );
}
