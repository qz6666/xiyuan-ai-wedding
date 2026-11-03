import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WeddingPlanner } from "../../wedding-planner";
import { isWeddingView, weddingPages } from "../../wedding-navigation";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  if (!isWeddingView(section)) return { title: "页面不存在 · 喜缘" };
  return {
    title: `${weddingPages[section].title} · 喜缘`,
    description: weddingPages[section].description,
  };
}

export default async function WorkspacePage({ params }: Props) {
  const { section } = await params;
  if (!isWeddingView(section)) notFound();
  if (section === "wedding-story") redirect("/wedding-story/");
  return <WeddingPlanner view={section} />;
}
