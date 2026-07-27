import {
  aiConfig,
  arkRequest,
  deepSeekRequest,
  handleAiError,
  jsonResponse,
  providerSource,
  requestModel,
  requestProviderKey,
} from "../../ai-providers";

type Verification = {
  deepSeek: boolean | null;
  ark: boolean | null;
};

type ProviderModels = {
  data?: Array<{ id?: string }>;
};

export async function GET(request: Request) {
  try {
    const config = aiConfig();
    const deepSeekBrowserKey = requestProviderKey(request, "deepseek");
    const arkBrowserKey = requestProviderKey(request, "ark");
    const deepSeekKey = deepSeekBrowserKey || config.deepSeekApiKey;
    const arkKey = arkBrowserKey || config.arkApiKey;
    const copyModel = requestModel(request, "x-deepseek-model", config.deepSeekModel);
    const imageModel = requestModel(request, "x-ark-image-model", config.imageModel);
    const videoModel = requestModel(request, "x-ark-video-model", config.videoModel);
    const verification: Verification = { deepSeek: null, ark: null };
    const errors: Partial<Record<keyof Verification, string>> = {};
    const latency: Partial<Record<keyof Verification, number>> = {};
    const modelAvailability = {
      copy: null as boolean | null,
      image: null as boolean | null,
      video: null as boolean | null,
    };

    if (new URL(request.url).searchParams.get("verify") === "1") {
      const checks: Array<Promise<void>> = [];
      if (deepSeekKey) {
        const startedAt = Date.now();
        checks.push(
          deepSeekRequest("/models", { method: "GET" }, deepSeekBrowserKey)
            .then(async (response) => {
              const payload = (await response.json()) as ProviderModels;
              const models = payload.data?.flatMap((item) => item.id || []) || [];
              verification.deepSeek = true;
              latency.deepSeek = Date.now() - startedAt;
              modelAvailability.copy = models.includes(copyModel);
            })
            .catch((error: unknown) => {
              verification.deepSeek = false;
              errors.deepSeek = error instanceof Error ? error.message : "DeepSeek 验证失败。";
            }),
        );
      }
      if (arkKey) {
        const startedAt = Date.now();
        checks.push(
          arkRequest("/models", { method: "GET" }, arkBrowserKey)
            .then(async (response) => {
              const payload = (await response.json()) as ProviderModels;
              const models = payload.data?.flatMap((item) => item.id || []) || [];
              verification.ark = true;
              latency.ark = Date.now() - startedAt;
              if (models.length > 0) {
                modelAvailability.image = models.includes(imageModel);
                modelAvailability.video = models.includes(videoModel);
              }
            })
            .catch((error: unknown) => {
              verification.ark = false;
              errors.ark = error instanceof Error ? error.message : "火山方舟验证失败。";
            }),
        );
      }
      await Promise.all(checks);
    }

    const copyConfigured = Boolean(deepSeekKey);
    const arkConfigured = Boolean(arkKey);
    return jsonResponse({
      configured: copyConfigured && arkConfigured,
      copy: {
        provider: "DeepSeek",
        configured: copyConfigured,
        source: providerSource(deepSeekBrowserKey, config.deepSeekApiKey),
        model: copyModel,
        verified: verification.deepSeek,
        latencyMs: latency.deepSeek || null,
        modelAvailable: modelAvailability.copy,
        error: errors.deepSeek || null,
      },
      image: {
        provider: "豆包 Seedream",
        configured: arkConfigured,
        source: providerSource(arkBrowserKey, config.arkApiKey),
        model: imageModel,
        verified: verification.ark,
        latencyMs: latency.ark || null,
        modelAvailable: modelAvailability.image,
        error: errors.ark || null,
      },
      video: {
        provider: "Seedance 2.0",
        configured: arkConfigured,
        source: providerSource(arkBrowserKey, config.arkApiKey),
        model: videoModel,
        verified: verification.ark,
        latencyMs: latency.ark || null,
        modelAvailable: modelAvailability.video,
        error: errors.ark || null,
      },
    });
  } catch (error) {
    return handleAiError(error);
  }
}
