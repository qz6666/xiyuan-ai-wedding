import {
  AuthError,
  authJson,
  confirmVerification,
} from "../../../auth";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      email?: unknown;
      code?: unknown;
    };
    const result = await confirmVerification(request, input);
    return authJson(
      { authenticated: true, user: result.user },
      200,
      { "set-cookie": result.cookie },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return authJson({ error: error.message, code: error.code }, error.status);
    }
    return authJson({ error: "邮箱验证失败，请稍后重试。" }, 500);
  }
}
