import {
  acceptCurrentPrivacy,
  privacyOverview,
} from "../privacy";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "隐私授权处理失败。";
  return json({ error: message }, message.includes("登录") ? 401 : 400);
}

export async function GET(request: Request) {
  try {
    return json(await privacyOverview(request));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as { accepted?: unknown };
    if (input.accepted !== true) {
      return json({ error: "请确认同意当前用户协议与隐私政策。" }, 400);
    }
    return json({ consent: await acceptCurrentPrivacy(request), current: true });
  } catch (error) {
    return errorResponse(error);
  }
}
