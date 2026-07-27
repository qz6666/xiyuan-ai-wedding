import {
  AuthError,
  authJson,
  requestPasswordReset,
} from "../../../auth";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as { email?: unknown };
    const result = await requestPasswordReset(request, input.email);
    return authJson({
      ...result,
      message: "如果该邮箱已注册，验证码会在几分钟内送达。",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authJson({ error: error.message, code: error.code }, error.status);
    }
    return authJson({ error: "找回邮件发送失败，请稍后重试。" }, 500);
  }
}
