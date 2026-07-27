import {
  applyStripeEvent,
  verifyStripeWebhook,
} from "../../billing";

export async function POST(request: Request) {
  const raw = await request.text();
  try {
    await verifyStripeWebhook(raw, request.headers.get("stripe-signature") || "");
    const event = JSON.parse(raw) as Parameters<typeof applyStripeEvent>[0];
    return Response.json(await applyStripeEvent(event));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "支付回调处理失败。" },
      { status: 400 },
    );
  }
}
