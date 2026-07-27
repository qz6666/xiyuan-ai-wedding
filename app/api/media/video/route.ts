import {
  aiConfig,
  AiProviderError,
  arkRequest,
  handleAiError,
  jsonResponse,
  mapVideoStatus,
  requestModel,
  requestProviderKey,
  validatePrompt,
  validateVideoId,
} from "../../ai-providers";
import {
  findIdempotentVideoJob,
  getVideoJob,
  getVideoJobStore,
  saveVideoJob,
  updateVideoJob,
  validateIdempotencyKey,
  type StoredVideoJob,
} from "../video-jobs";
import { resolveDataScope } from "../../data-scope";
import { getCloudflareBinding } from "../../cloudflare";
import {
  reserveAiUsage,
  settleAiUsage,
  settleRequestAiUsage,
  type AiUsageReservation,
} from "../../usage";

type VideoTaskQueue = {
  send(
    message: { id: string; scopeId: string },
    options?: { delaySeconds?: number },
  ): Promise<void>;
};

type VideoRequest = {
  prompt?: unknown;
  ratio?: unknown;
  seconds?: unknown;
  title?: unknown;
  style?: unknown;
};

type ArkVideoTask = {
  id?: string;
  status?: string;
  model?: string;
  error?: {
    message?: string;
  };
};

function progressForStatus(status: string) {
  if (status === "completed") return 100;
  if (status === "in_progress") return 55;
  if (status === "failed" || status === "cancelled") return 0;
  return 8;
}

async function settleStoredVideoUsage(
  job: StoredVideoJob,
  succeeded: boolean,
) {
  if (!job.usageOwnerId || !job.usageReservationId) return;
  const store = await getVideoJobStore();
  if (!store) return;
  await settleAiUsage(
    store,
    job.usageOwnerId,
    job.usageReservationId,
    succeeded,
    job.id,
  );
}

export async function POST(request: Request) {
  let reservation: AiUsageReservation | null = null;
  let reservationCommitted = false;
  try {
    const writableScope = await resolveDataScope(request);
    if (writableScope && !writableScope.canWrite) {
      throw new AiProviderError("当前角色只有查看权限。", 403, "workspace_read_only");
    }
    const body = (await request.json()) as VideoRequest;
    const prompt = validatePrompt(body.prompt);
    const ratio = body.ratio === "9:16" ? "9:16" : "16:9";
    const seconds = [4, 8, 12].includes(Number(body.seconds)) ? Number(body.seconds) : 8;
    const config = aiConfig();
    const browserArkKey = requestProviderKey(request, "ark");
    const videoModel = requestModel(request, "x-ark-video-model", config.videoModel);
    const idempotency = validateIdempotencyKey(
      request.headers.get("x-idempotency-key"),
    );
    const existing = await findIdempotentVideoJob(request, idempotency);
    if (existing) return jsonResponse({ ...existing, recovered: true });
    if (!request.headers.get("x-ark-api-key")?.trim()) {
      reservation = await reserveAiUsage(request, "video", { seconds });
    }
    const upstream = await arkRequest(
      "/contents/generations/tasks",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: videoModel,
          content: [
            {
              type: "text",
              text: `${prompt} --ratio ${ratio} --dur ${seconds} --resolution 720p --watermark false`,
            },
          ],
        }),
      },
      browserArkKey,
    );
    const task = (await upstream.json()) as ArkVideoTask;
    if (!task.id) {
      throw new AiProviderError(
        "Seedance 没有返回任务编号，请稍后重试。",
        502,
        "missing_video_id",
      );
    }
    const status = mapVideoStatus(task.status);
    const now = new Date().toISOString();
    const scope = await resolveDataScope(request);
    const queue = await getCloudflareBinding<VideoTaskQueue>("VIDEO_TASK_QUEUE");
    const backgroundMode =
      !browserArkKey && Boolean(config.arkApiKey) && Boolean(scope && queue)
        ? "queue"
        : "browser";
    const storedJob: StoredVideoJob = {
      id: task.id,
      status,
      progress: progressForStatus(status),
      model: task.model || videoModel,
      prompt,
      ratio,
      seconds,
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim().slice(0, 100)
          : "Seedance 婚礼视频",
      style:
        typeof body.style === "string" && body.style.trim()
          ? body.style.trim().slice(0, 40)
          : "婚礼电影",
      createdAt: now,
      updatedAt: now,
      attempts: 1,
      backgroundMode,
      mediaPrefix: scope?.mediaPrefix || null,
      nextCheckAt:
        backgroundMode === "queue"
          ? new Date(Date.now() + 15_000).toISOString()
          : null,
      error: null,
      usageOwnerId: reservation?.ownerId || null,
      usageReservationId: reservation?.id || null,
    };
    const registered = await saveVideoJob(request, storedJob, idempotency);
    reservationCommitted = Boolean(registered && reservation);
    let backgroundQueued = false;
    if (registered && backgroundMode === "queue" && scope && queue) {
      await queue.send(
        { id: storedJob.id, scopeId: scope.id },
        { delaySeconds: 15 },
      );
      backgroundQueued = true;
    }

    return jsonResponse({
      ...storedJob,
      registered,
      backgroundQueued,
    });
  } catch (error) {
    if (reservation && !reservationCommitted) {
      await settleRequestAiUsage(request, reservation, false);
    }
    return handleAiError(error);
  }
}

export async function GET(request: Request) {
  try {
    const id = validateVideoId(new URL(request.url).searchParams.get("id"));
    const scope = await resolveDataScope(request);
    const savedJob = await getVideoJob(request, id);
    if (scope?.authenticated && !savedJob) {
      throw new AiProviderError("视频任务不存在或不属于当前账号。", 404, "video_job_not_found");
    }
    if (
      savedJob &&
      (savedJob.status === "completed" ||
        savedJob.status === "failed" ||
        savedJob.status === "cancelled")
    ) {
      await settleStoredVideoUsage(
        savedJob,
        savedJob.status === "completed",
      );
      return jsonResponse(savedJob);
    }
    const upstream = await arkRequest(
      `/contents/generations/tasks/${encodeURIComponent(id)}`,
      { method: "GET" },
      requestProviderKey(request, "ark"),
    );
    const task = (await upstream.json()) as ArkVideoTask;
    const status = mapVideoStatus(task.status);
    const updated = await updateVideoJob(request, id, {
      status,
      progress: progressForStatus(status),
      model: task.model || undefined,
      error: task.error?.message || null,
    });
    if (updated && (status === "completed" || status === "failed" || status === "cancelled")) {
      await settleStoredVideoUsage(updated, status === "completed");
    }

    return jsonResponse({
      id: task.id || id,
      status,
      progress: progressForStatus(status),
      model: task.model,
      error: task.error?.message || null,
    });
  } catch (error) {
    return handleAiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = validateVideoId(new URL(request.url).searchParams.get("id"));
    const scope = await resolveDataScope(request);
    if (scope?.authenticated && !(await getVideoJob(request, id))) {
      throw new AiProviderError("视频任务不存在或不属于当前账号。", 404, "video_job_not_found");
    }
    await arkRequest(
      `/contents/generations/tasks/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      requestProviderKey(request, "ark"),
    );
    const updated = await updateVideoJob(request, id, {
      status: "cancelled",
      progress: 0,
      error: "任务已由用户取消。",
    });
    if (updated) await settleStoredVideoUsage(updated, false);
    return jsonResponse({ deleted: true });
  } catch (error) {
    return handleAiError(error);
  }
}
