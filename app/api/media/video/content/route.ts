import {
  AiProviderError,
  arkRequest,
  handleAiError,
  requestProviderKey,
  validateVideoId,
  videoUrlFromPayload,
} from "../../../ai-providers";
import { resolveDataScope } from "../../../data-scope";
import { getVideoJob } from "../../video-jobs";
import { getCloudflareBinding } from "../../../cloudflare";

type R2ObjectLike = {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
  size: number;
};

type R2BucketLike = {
  get(key: string): Promise<R2ObjectLike | null>;
};

export async function GET(request: Request) {
  try {
    const id = validateVideoId(new URL(request.url).searchParams.get("id"));
    const scope = await resolveDataScope(request);
    const job = await getVideoJob(request, id);
    if (scope?.authenticated && !job) {
      throw new AiProviderError(
        "视频任务不存在或不属于当前账号。",
        404,
        "video_job_not_found",
      );
    }
    if (job?.storageKey) {
      const bucket = await getCloudflareBinding<R2BucketLike>("MEDIA_BUCKET");
      const object = bucket ? await bucket.get(job.storageKey) : null;
      if (object) {
        return new Response(await object.arrayBuffer(), {
          status: 200,
          headers: {
            "cache-control": "private, max-age=3600",
            "content-disposition": `inline; filename="xiyuan-${id}.mp4"`,
            "content-length": String(object.size),
            "content-type": object.httpMetadata?.contentType || "video/mp4",
          },
        });
      }
    }
    const apiKey = requestProviderKey(request, "ark");
    const statusResponse = await arkRequest(
      `/contents/generations/tasks/${encodeURIComponent(id)}`,
      { method: "GET" },
      apiKey,
    );
    const payload = (await statusResponse.json()) as Record<string, unknown>;
    const videoUrl = videoUrlFromPayload(payload);
    if (!videoUrl) {
      throw new AiProviderError(
        "视频仍在生成或成品地址暂不可用。",
        409,
        "video_content_pending",
      );
    }

    const upstream = await fetch(videoUrl);
    if (!upstream.ok || !upstream.body) {
      throw new AiProviderError(
        "视频已生成，但读取成品失败，请稍后重试。",
        502,
        "video_download_failed",
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="xiyuan-${id}.mp4"`,
        "content-type": upstream.headers.get("content-type") || "video/mp4",
      },
    });
  } catch (error) {
    return handleAiError(error);
  }
}
