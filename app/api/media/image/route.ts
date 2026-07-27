import {
  aiConfig,
  arkImageResult,
  arkRequest,
  handleAiError,
  jsonResponse,
  requestModel,
  requestProviderKey,
  validatePrompt,
} from "../../ai-providers";
import { resolveDataScope } from "../../data-scope";
import {
  reserveAiUsage,
  settleRequestAiUsage,
  type AiUsageReservation,
} from "../../usage";

type ImageRequest = {
  prompt?: unknown;
  ratio?: unknown;
};

const imageSizes = {
  "16:9": "2048x1152",
  "9:16": "1152x2048",
  "1:1": "2048x2048",
} as const;

export async function POST(request: Request) {
  try {
    const scope = await resolveDataScope(request);
    if (scope && !scope.canWrite) {
      return jsonResponse({ error: "当前角色只有查看权限。" }, 403);
    }
    const body = (await request.json()) as ImageRequest;
    const prompt = validatePrompt(body.prompt);
    const ratio = body.ratio === "9:16" || body.ratio === "1:1" ? body.ratio : "16:9";
    const config = aiConfig();
    const imageModel = requestModel(request, "x-ark-image-model", config.imageModel);
    const apiKey = requestProviderKey(request, "ark");
    let reservation: AiUsageReservation | null = null;
    if (!request.headers.get("x-ark-api-key")?.trim()) {
      reservation = await reserveAiUsage(request, "image");
    }
    try {
      const upstream = await arkRequest(
        "/images/generations",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: imageModel,
            prompt,
            size: imageSizes[ratio],
            response_format: "b64_json",
            watermark: false,
            sequential_image_generation: "disabled",
            stream: false,
          }),
        },
        apiKey,
      );
      const payload = (await upstream.json()) as {
        data?: Array<{
          b64_json?: string;
          url?: string;
          revised_prompt?: string;
        }>;
      };
      const image = await arkImageResult(payload);

      await settleRequestAiUsage(request, reservation, true);
      return jsonResponse({
        ...image,
        model: imageModel,
      });
    } catch (error) {
      await settleRequestAiUsage(request, reservation, false);
      throw error;
    }
  } catch (error) {
    return handleAiError(error);
  }
}
