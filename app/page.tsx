import type { Metadata } from "next";
import { WeddingPlanner } from "./wedding-planner";

export const metadata: Metadata = {
  title: "喜缘 · AI 备婚搭子",
  description: "把繁琐的婚礼筹备拆成每天能完成的小事，AI 全程陪伴，不再焦虑，不再遗漏。",
};

export default function Home() {
  return <WeddingPlanner />;
}
