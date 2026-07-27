const DEEPSEEK_API_BASE = "https://api.deepseek.com";
const ARK_API_BASE = "https://ark.cn-beijing.volces.com/api/v3";

type ProviderErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
  message?: string;
};

export type ProviderSource = "browser" | "server" | "none";

export function aiConfig() {
  return {
    deepSeekApiKey: process.env.DEEPSEEK_API_KEY?.trim() || "",
    deepSeekModel: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash",
    arkApiKey: process.env.ARK_API_KEY?.trim() || "",
    imageModel: process.env.ARK_IMAGE_MODEL?.trim() || "doubao-seedream-5-0-260128",
    videoModel: process.env.ARK_VIDEO_MODEL?.trim() || "doubao-seedance-2-0-260128",
  };
}

function validateApiKey(value: string) {
  if (value.length > 500 || /[\r\n]/.test(value)) {
    throw new AiProviderError("API Key 格式无效。", 400, "invalid_api_key");
  }
  return value;
}

export function requestProviderKey(
  request: Request,
  provider: "deepseek" | "ark",
) {
  const header = provider === "deepseek" ? "x-deepseek-api-key" : "x-ark-api-key";
  return validateApiKey(request.headers.get(header)?.trim() || "");
}

export function requestModel(request: Request, header: string, fallback: string) {
  const model = request.headers.get(header)?.trim() || fallback;
  if (!/^[A-Za-z0-9._-]{3,100}$/.test(model)) {
    throw new AiProviderError("模型编号格式无效。", 400, "invalid_model");
  }
  return model;
}

export function providerSource(browserKey: string, serverKey: string): ProviderSource {
  return browserKey ? "browser" : serverKey ? "server" : "none";
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export function validatePrompt(value: unknown, minimum = 8) {
  if (typeof value !== "string" || value.trim().length < minimum) {
    throw new AiProviderError(`请把要求写得更具体一些，至少输入 ${minimum} 个字。`, 400);
  }

  const prompt = value.trim();
  if (prompt.length > 3000) {
    throw new AiProviderError("输入内容过长，请控制在 3000 个字以内。", 400);
  }
  return prompt;
}

export function validateVideoId(value: string | null) {
  if (!value || !/^cgt-[A-Za-z0-9_-]+$/.test(value)) {
    throw new AiProviderError("视频任务编号无效。", 400, "invalid_video_id");
  }
  return value;
}

async function providerRequest(
  baseUrl: string,
  path: string,
  init: RequestInit,
  apiKey: string,
  providerName: string,
) {
  if (!apiKey) {
    throw new AiProviderError(
      `${providerName} 尚未配置，请先填写对应 API Key。`,
      503,
      "missing_api_key",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new AiProviderError(
      `${providerName} 连接失败，请检查网络后重试。`,
      502,
      "provider_connection_error",
    );
  }

  if (!response.ok) {
    let payload: ProviderErrorPayload | null = null;
    try {
      payload = (await response.clone().json()) as ProviderErrorPayload;
    } catch {
      // Some upstream errors do not include JSON.
    }
    const message =
      payload?.error?.message ||
      payload?.message ||
      (response.status === 401
        ? `${providerName} API Key 无效或已失效。`
        : response.status === 429
          ? `${providerName} 当前请求较多或额度不足，请稍后重试。`
          : `${providerName} 暂时无法完成请求，请稍后重试。`);
    throw new AiProviderError(
      message,
      response.status >= 400 && response.status < 600 ? response.status : 502,
      payload?.error?.code,
    );
  }

  return response;
}

export function deepSeekRequest(path: string, init: RequestInit, apiKeyOverride = "") {
  const apiKey = apiKeyOverride || aiConfig().deepSeekApiKey;
  return providerRequest(DEEPSEEK_API_BASE, path, init, apiKey, "DeepSeek");
}

export function arkRequest(path: string, init: RequestInit, apiKeyOverride = "") {
  const apiKey = apiKeyOverride || aiConfig().arkApiKey;
  return providerRequest(ARK_API_BASE, path, init, apiKey, "火山方舟");
}

export function bytesToBase64(bytes: ArrayBuffer) {
  const view = new Uint8Array(bytes);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < view.length; offset += chunkSize) {
    binary += String.fromCharCode(...view.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export async function arkImageResult(payload: {
  data?: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
}) {
  const image = payload.data?.[0];
  if (image?.b64_json) {
    return {
      imageBase64: image.b64_json,
      mimeType: "image/png",
      revisedPrompt: image.revised_prompt || null,
    };
  }

  if (image?.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new AiProviderError("图片已生成，但下载生成结果失败。", 502, "image_download_failed");
    }
    const bytes = await imageResponse.arrayBuffer();
    return {
      imageBase64: bytesToBase64(bytes),
      mimeType: imageResponse.headers.get("content-type") || "image/jpeg",
      revisedPrompt: image.revised_prompt || null,
    };
  }

  throw new AiProviderError(
    "图片已生成，但服务没有返回可用的图片内容。",
    502,
    "empty_image_result",
  );
}

export function mapVideoStatus(status?: string) {
  if (status === "succeeded") return "completed";
  if (status === "running") return "in_progress";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  return "queued";
}

export function videoUrlFromPayload(payload: Record<string, unknown>) {
  const content = payload.content as
    | {
        video_url?: string;
        video?: { url?: string };
      }
    | undefined;
  const output = payload.output as { video_url?: string; url?: string } | undefined;
  const result = payload.result as { video_url?: string; url?: string } | undefined;
  return (
    content?.video_url ||
    content?.video?.url ||
    output?.video_url ||
    output?.url ||
    result?.video_url ||
    result?.url ||
    ""
  );
}

export function handleAiError(error: unknown) {
  if (error instanceof AiProviderError) {
    return jsonResponse(
      {
        error: error.message,
        code: error.code,
      },
      error.status,
    );
  }

  return jsonResponse(
    {
      error: "AI 服务处理失败，请稍后重试。",
      code: "ai_service_error",
    },
    500,
  );
}

export class AiProviderError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AiProviderError";
    this.status = status;
    this.code = code;
  }
}
