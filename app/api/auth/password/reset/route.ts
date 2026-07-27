import {
  AuthError,
  authJson,
  resetPassword,
} from "../../../auth";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      email?: unknown;
      code?: unknown;
      password?: unknown;
    };
    const result = await resetPassword(request, input);
    return authJson(
      { authenticated: true, user: result.user },
      200,
      { "set-cookie": result.cookie },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return authJson({ error: error.message, code: error.code }, error.status);
    }
    return authJson({ error: "密码重置失败，请稍后重试。" }, 500);
  }
}
