import {
  aiConfig,
  AiProviderError,
  arkImageResult,
  arkRequest,
  bytesToBase64,
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

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 12 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const scope = await resolveDataScope(request);
    if (scope && !scope.canWrite) {
      return jsonResponse({ error: "当前角色只有查看权限。" }, 403);
    }
    const input = await request.formData();
    const source = input.get("image");
    const prompt = validatePrompt(input.get("prompt"));
    if (!(source instanceof File)) {
      throw new AiProviderError(
        "请先上传一张清晰的本人正面照片。",
        400,
        "missing_portrait",
      );
    }
    if (!allowedImageTypes.has(source.type)) {
      throw new AiProviderError(
        "仅支持 JPG、PNG 或 WebP 图片。",
        400,
        "unsupported_portrait",
      );
    }
    if (source.size > maxImageBytes) {
      throw new AiProviderError("照片不能超过 12MB。", 400, "portrait_too_large");
    }

    const config = aiConfig();
    const imageModel = requestModel(request, "x-ark-image-model", config.imageModel);
    const sourceBase64 = bytesToBase64(await source.arrayBuffer());
    const sourceDataUrl = `data:${source.type};base64,${sourceBase64}`;
    const apiKey = requestProviderKey(request, "ark");
    let reservation: AiUsageReservation | null = null;
    if (!request.headers.get("x-ark-api-key")?.trim()) {
      reservation = await reserveAiUsage(request, "portrait");
    }
    try {
      const upstream = await arkRequest(
        "/images/generations",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: imageModel,
            prompt: `${prompt}。严格保留输入人物的身份特征、五官比例与自然肤质，制作正式证件照；正面平视，肩部以上构图，服装整洁，无文字，无水印。`,
            image: sourceDataUrl,
            size: "1536x2048",
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
