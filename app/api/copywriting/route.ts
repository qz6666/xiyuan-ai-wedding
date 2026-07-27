import {
  aiConfig,
  AiProviderError,
  deepSeekRequest,
  handleAiError,
  jsonResponse,
  requestModel,
  requestProviderKey,
  validatePrompt,
} from "../ai-providers";
import { resolveDataScope } from "../data-scope";
import {
  reserveAiUsage,
  settleRequestAiUsage,
  type AiUsageReservation,
} from "../usage";

type CopywritingRequest = {
  kind?: unknown;
  tone?: unknown;
  brief?: unknown;
  profile?: {
    brideName?: unknown;
    groomName?: unknown;
    weddingDate?: unknown;
    city?: unknown;
    guestCount?: unknown;
    style?: unknown;
  };
};

function plainText(value: unknown, fallback: string, maxLength = 100) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, maxLength) || fallback;
}

function parseCopywriting(content: string, kind: string) {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { title?: unknown; content?: unknown };
    if (typeof parsed.title === "string" && typeof parsed.content === "string") {
      return {
        title: parsed.title.trim().slice(0, 80),
        content: parsed.content.trim(),
      };
    }
  } catch {
    // A plain-text response is still useful and should not be discarded.
  }
  return {
    title: `AI 生成的${kind}`,
    content: cleaned,
  };
}

export async function POST(request: Request) {
  try {
    const scope = await resolveDataScope(request);
    if (scope && !scope.canWrite) {
      throw new AiProviderError("当前角色只有查看权限。", 403, "workspace_read_only");
    }
    const body = (await request.json()) as CopywritingRequest;
    const kind = plainText(body.kind, "婚礼文案", 30);
    const tone = plainText(body.tone, "温柔正式", 30);
    const brief = validatePrompt(body.brief, 4);
    const profile = body.profile || {};
    const config = aiConfig();
    const model = requestModel(request, "x-deepseek-model", config.deepSeekModel);
    const apiKey = requestProviderKey(request, "deepseek");
    let reservation: AiUsageReservation | null = null;
    if (!request.headers.get("x-deepseek-api-key")?.trim()) {
      reservation = await reserveAiUsage(request, "copy");
    }

    try {
      const upstream = await deepSeekRequest(
        "/chat/completions",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            temperature: 0.8,
            max_tokens: 1800,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "你是专业中文婚礼文案策划。内容必须真诚、可直接使用，不虚构具体地址和人物经历，不使用俗套网络语。只返回 JSON，格式为 {\"title\":\"标题\",\"content\":\"正文\"}。",
              },
              {
                role: "user",
                content: [
                  `文案类型：${kind}`,
                  `语气：${tone}`,
                  `新人：${plainText(profile.brideName, "新娘")} 与 ${plainText(profile.groomName, "新郎")}`,
                  `婚期：${plainText(profile.weddingDate, "待确认")}`,
                  `城市：${plainText(profile.city, "待确认")}`,
                  `婚礼风格：${plainText(profile.style, "待确认")}`,
                  `预计宾客：${Math.max(0, Number(profile.guestCount) || 0)} 位`,
                  `重点要求：${brief}`,
                  "请按该文案类型给出完整成稿，合理分段。",
                ].join("\n"),
              },
            ],
          }),
        },
        apiKey,
      );
      const payload = (await upstream.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new AiProviderError(
          "DeepSeek 没有返回可用文案，请稍后重试。",
          502,
          "empty_copywriting_result",
        );
      }

      await settleRequestAiUsage(request, reservation, true);
      return jsonResponse({
        ...parseCopywriting(content, kind),
        model,
        usage: payload.usage || null,
      });
    } catch (error) {
      await settleRequestAiUsage(request, reservation, false);
      throw error;
    }
  } catch (error) {
    return handleAiError(error);
  }
}
