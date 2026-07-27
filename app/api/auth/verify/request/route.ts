import {
  AuthError,
  authJson,
  requestVerificationCode,
} from "../../../auth";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as { email?: unknown };
    const result = await requestVerificationCode(request, input.email);
    return authJson(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return authJson({ error: error.message, code: error.code }, error.status);
    }
    return authJson({ error: "验证码发送失败，请稍后重试。" }, 500);
  }
}
