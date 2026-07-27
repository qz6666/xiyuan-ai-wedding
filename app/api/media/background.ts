import {
  mapVideoStatus,
  videoUrlFromPayload,
} from "../ai-providers";
import {
  getVideoJobForScope,
  listActiveVideoJobReferences,
  updateVideoJobForScope,
  type JobStore,
  type StoredVideoJob,
  type VideoJobReference,
} from "./video-jobs";
import { settleAiUsage } from "../usage";
import {
  recordOperationalIncident,
  recordOperationalMetric,
} from "../operations";

export type VideoQueueMessage = VideoJobReference;

type MediaBucket = {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
};

export type BackgroundEnv = {
  ARK_API_KEY?: string;
  MEDIA_BUCKET?: MediaBucket;
  WEDDING_DATA?: JobStore;
  VIDEO_TASK_QUEUE?: {
    send(
      message: VideoQueueMessage,
      options?: { delaySeconds?: number },
    ): Promise<void>;
  };
};

type QueueMessage<T> = {
  body: T;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};

export type QueueBatch<T> = {
  messages: Array<QueueMessage<T>>;
};

function progressForStatus(status: StoredVideoJob["status"]) {
  if (status === "completed") return 100;
  if (status === "in_progress") return 60;
  if (status === "failed" || status === "cancelled") return 0;
  return 10;
}

function retryDelay(attempts: number) {
  return Math.min(120, Math.max(15, 10 * 2 ** Math.min(3, attempts)));
}

async function archiveCompletedVideo(
  env: BackgroundEnv,
  scopeId: string,
  job: StoredVideoJob,
  videoUrl: string,
) {
  if (!env.MEDIA_BUCKET || job.storageKey) {
    return {
      storageKey: job.storageKey || null,
      sizeBytes: job.sizeBytes || null,
    };
  }
  const response = await fetch(videoUrl);
  if (!response.ok) throw new Error(`视频归档下载失败（${response.status}）。`);
  const content = await response.arrayBuffer();
  if (content.byteLength > 100 * 1024 * 1024) {
    throw new Error("视频成品超过 100MB，未自动归档。");
  }
  const key = `${job.mediaPrefix || scopeId}/${crypto.randomUUID()}.mp4`;
  await env.MEDIA_BUCKET.put(key, content, {
    httpMetadata: { contentType: "video/mp4" },
  });
  return { storageKey: key, sizeBytes: content.byteLength };
}

export async function processVideoJob(
  env: BackgroundEnv,
  reference: VideoJobReference,
) {
  const store = env.WEDDING_DATA;
  const apiKey = env.ARK_API_KEY?.trim() || "";
  if (!store || !apiKey) {
    return { terminal: false, retryAfter: 120, reason: "background_not_configured" };
  }
  const job = await getVideoJobForScope(store, reference.scopeId, reference.id);
  if (!job) return { terminal: true, reason: "job_missing" };
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    if (job.usageOwnerId && job.usageReservationId) {
      await settleAiUsage(
        store,
        job.usageOwnerId,
        job.usageReservationId,
        job.status === "completed",
        job.id,
      );
    }
    return { terminal: true, reason: job.status };
  }

  const response = await fetch(
    `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${encodeURIComponent(reference.id)}`,
    {
      method: "GET",
      headers: { authorization: `Bearer ${apiKey}` },
    },
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      const updated = await updateVideoJobForScope(store, reference.scopeId, reference.id, {
        status: "failed",
        progress: 0,
        attempts: job.attempts + 1,
        lastPolledAt: new Date().toISOString(),
        error: `后台查询失败（${response.status}），请检查服务器 API 配置。`,
      });
      if (updated?.usageOwnerId && updated.usageReservationId) {
        await settleAiUsage(
          store,
          updated.usageOwnerId,
          updated.usageReservationId,
          false,
          updated.id,
        );
      }
      return { terminal: true, reason: "provider_rejected" };
    }
    throw new Error(`视频任务查询失败（${response.status}）。`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const providerError = payload.error as { message?: string } | undefined;
  const status = mapVideoStatus(
    typeof payload.status === "string" ? payload.status : undefined,
  );
  const attempts = job.attempts + 1;
  const now = new Date().toISOString();
  if (status === "completed") {
    const videoUrl = videoUrlFromPayload(payload);
    let archive: { storageKey: string | null; sizeBytes: number | null } = {
      storageKey: null,
      sizeBytes: null,
    };
    let archiveError = "";
    if (videoUrl) {
      try {
        archive = await archiveCompletedVideo(env, reference.scopeId, job, videoUrl);
      } catch (error) {
        archiveError = error instanceof Error ? error.message : "视频自动归档失败。";
      }
    }
    const updated = await updateVideoJobForScope(store, reference.scopeId, reference.id, {
      status,
      progress: 100,
      attempts,
      lastPolledAt: now,
      nextCheckAt: null,
      storageKey: archive.storageKey,
      sizeBytes: archive.sizeBytes,
      error: archiveError || null,
    });
    if (updated?.usageOwnerId && updated.usageReservationId) {
      await settleAiUsage(
        store,
        updated.usageOwnerId,
        updated.usageReservationId,
        true,
        updated.id,
      );
    }
    return { terminal: true, reason: "completed" };
  }
  if (status === "failed" || status === "cancelled") {
    const updated = await updateVideoJobForScope(store, reference.scopeId, reference.id, {
      status,
      progress: 0,
      attempts,
      lastPolledAt: now,
      nextCheckAt: null,
      error: providerError?.message || `视频任务${status === "failed" ? "失败" : "已取消"}。`,
    });
    if (updated?.usageOwnerId && updated.usageReservationId) {
      await settleAiUsage(
        store,
        updated.usageOwnerId,
        updated.usageReservationId,
        false,
        updated.id,
      );
    }
    return { terminal: true, reason: status };
  }

  const retryAfter = retryDelay(attempts);
  await updateVideoJobForScope(store, reference.scopeId, reference.id, {
    status,
    progress: progressForStatus(status),
    attempts,
    lastPolledAt: now,
    nextCheckAt: new Date(Date.now() + retryAfter * 1000).toISOString(),
    error: null,
  });
  return { terminal: false, retryAfter, reason: status };
}

export async function consumeVideoQueue(
  batch: QueueBatch<VideoQueueMessage>,
  env: BackgroundEnv,
) {
  await Promise.all(
    batch.messages.map(async (message) => {
      try {
        const result = await processVideoJob(env, message.body);
        if (result.terminal) message.ack();
        else message.retry({ delaySeconds: result.retryAfter });
      } catch (error) {
        await Promise.all([
          recordOperationalMetric(env.WEDDING_DATA, "queueRetries"),
          recordOperationalIncident(env.WEDDING_DATA, {
            source: "video-queue",
            severity: "error",
            code: "video_queue_retry",
            message:
              error instanceof Error ? error.message : "视频队列处理失败",
            path: message.body.id,
          }),
        ]);
        message.retry({ delaySeconds: 60 });
      }
    }),
  );
}

export async function recoverStalledVideoJobs(env: BackgroundEnv) {
  const store = env.WEDDING_DATA;
  if (!store || !env.VIDEO_TASK_QUEUE) return { queued: 0 };
  const references = await listActiveVideoJobReferences(store);
  const now = Date.now();
  let queued = 0;
  for (const reference of references) {
    const job = await getVideoJobForScope(store, reference.scopeId, reference.id);
    if (!job || job.backgroundMode !== "queue") continue;
    const nextCheck = job.nextCheckAt ? new Date(job.nextCheckAt).getTime() : 0;
    if (nextCheck > now) continue;
    await env.VIDEO_TASK_QUEUE.send(reference, { delaySeconds: 1 });
    queued += 1;
  }
  return { queued };
}
