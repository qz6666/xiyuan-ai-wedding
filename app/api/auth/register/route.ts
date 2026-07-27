import { AuthError, authJson, registerUser } from "../../auth";
import { recordPrivacyConsent } from "../../privacy";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      displayName?: unknown;
      acceptedTerms?: unknown;
    };
    if (input.acceptedTerms !== true) {
      throw new AuthError("请先同意用户协议与隐私政策。", 400, "consent_required");
    }
    const result = await registerUser(request, input);
    await recordPrivacyConsent(
      { id: result.userId, email: result.email },
      "registration",
    );
    return authJson({ authenticated: false, ...result }, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      return authJson({ error: error.message, code: error.code }, error.status);
    }
    return authJson({ error: "注册失败，请稍后重试。" }, 500);
  }
}
