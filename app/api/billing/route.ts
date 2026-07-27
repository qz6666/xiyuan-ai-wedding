import {
  billingOverview,
  createCheckoutSession,
} from "../billing";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const overview = await billingOverview(request);
  if (!overview) return json({ error: "请先登录。" }, 401);
  return json(overview);
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as { plan?: unknown };
    return json(await createCheckoutSession(request, input.plan), 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "支付服务处理失败。";
    return json(
      { error: message },
      message.includes("登录") ? 401 : message.includes("只有") ? 403 : 400,
    );
  }
}
