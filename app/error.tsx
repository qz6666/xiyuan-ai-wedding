"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: error.name,
        message: error.message,
        path: window.location.pathname,
      }),
    });
  }, [error]);

  return (
    <main className="system-state-page">
      <TriangleAlert size={34} aria-hidden="true" />
      <span>喜缘运行保护</span>
      <h1>这个页面暂时没有完成加载</h1>
      <p>你的云端资料不会因此丢失。可以重新加载当前页面，或先返回首页继续其他操作。</p>
      <div>
        <button type="button" onClick={reset}>
          <RefreshCw size={16} aria-hidden="true" />
          重新加载
        </button>
        <Link href="/">返回首页</Link>
      </div>
    </main>
  );
}
