import {
  AuthError,
  authJson,
  listUserSessions,
  revokeUserSessions,
} from "../../auth";

function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return authJson({ error: error.message, code: error.code }, error.status);
  }
  return authJson({ error: "登录设备管理失败。" }, 500);
}

export async function GET(request: Request) {
  try {
    return authJson({ sessions: await listUserSessions(request) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const input = (await request.json()) as {
      action?: unknown;
      sessionId?: unknown;
    };
    return authJson(await revokeUserSessions(request, input));
  } catch (error) {
    return errorResponse(error);
  }
}
