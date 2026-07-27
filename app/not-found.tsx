import { Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-state-page">
      <Search size={34} aria-hidden="true" />
      <span>喜缘页面导航</span>
      <h1>没有找到这个页面</h1>
      <p>链接可能已经更新，原有备婚资料不会受到影响。</p>
      <div>
        <Link href="/">返回备婚工作台</Link>
      </div>
    </main>
  );
}
