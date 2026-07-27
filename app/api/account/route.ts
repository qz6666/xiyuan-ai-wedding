import {
  accountLifecycleOverview,
  cancelAccountDeletion,
  requestAccountDeletion,
} from "../account-lifecycle";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "账号生命周期操作失败。";
  return json({ error: message }, message.includes("登录") ? 401 : 400);
}

export async function GET(request: Request) {
  try {
    return json(await accountLifecycleOverview(request));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as { confirmation?: unknown };
    return json({
      deletion: await requestAccountDeletion(request, input.confirmation),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    return json({ deletion: await cancelAccountDeletion(request) });
  } catch (error) {
    return errorResponse(error);
  }
}
