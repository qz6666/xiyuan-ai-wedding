import {
  adminOverview,
  runAdminAction,
} from "../admin";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "后台服务处理失败。";
  const status = message.includes("登录")
    ? 401
    : message.includes("权限")
      ? 403
      : 400;
  return json({ error: message }, status);
}

export async function GET(request: Request) {
  try {
    return json(await adminOverview(request));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      action?: unknown;
      ownerId?: unknown;
      units?: unknown;
      plan?: unknown;
    };
    return json(await runAdminAction(request, input));
  } catch (error) {
    return errorResponse(error);
  }
}
