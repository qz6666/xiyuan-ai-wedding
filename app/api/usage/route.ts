import { aiUsageOverview } from "../usage";

export async function GET(request: Request) {
  const overview = await aiUsageOverview(request);
  if (!overview) {
    return Response.json(
      { error: "请先登录后查看 AI 额度。" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  return Response.json(overview, {
    headers: { "cache-control": "no-store" },
  });
}
