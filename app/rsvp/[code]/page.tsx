import type { Metadata } from "next";
import { RsvpClient } from "./rsvp-client";

export const metadata: Metadata = {
  title: "婚礼邀请回执 · 喜缘",
  description: "确认婚礼出席信息、人数与饮食需求。",
};

export default async function RsvpPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RsvpClient code={code} />;
}
