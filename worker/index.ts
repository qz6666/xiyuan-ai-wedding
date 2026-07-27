/** Cloudflare Worker entry point for the AI wedding flow system. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  consumeVideoQueue,
  recoverStalledVideoJobs,
  type BackgroundEnv,
  type QueueBatch,
  type VideoQueueMessage,
} from "../app/api/media/background";
import {
  processAutomatedReminders,
  type ReminderEnv,
} from "../app/api/reminders";
import {
  recordOperationalIncident,
  recordOperationalMetric,
  type OperationsStore,
} from "../app/api/operations";
import {
  applySecurityHeaders,
  enforceRequestSecurity,
  type SecurityStore,
} from "../app/api/security";
import {
  processScheduledAccountDeletions,
  type AccountLifecycleEnv,
} from "../app/api/account-lifecycle";

interface Env extends BackgroundEnv, ReminderEnv, AccountLifecycleEnv {
  ASSETS: Fetcher;
  DB?: D1Database;
  WEDDING_DATA?: BackgroundEnv["WEDDING_DATA"] &
    ReminderEnv["WEDDING_DATA"] &
    SecurityStore &
    OperationsStore;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const securityResponse = await enforceRequestSecurity(
      request,
      env.WEDDING_DATA,
    );
    if (securityResponse) {
      if (securityResponse.status === 429) {
        ctx.waitUntil(
          recordOperationalMetric(env.WEDDING_DATA, "rateLimited"),
        );
      }
      return applySecurityHeaders(request, securityResponse);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return applySecurityHeaders(request, response);
    }

    const response = await handler.fetch(request, env, ctx);
    ctx.waitUntil(recordOperationalMetric(env.WEDDING_DATA, "requests"));
    if (response.status >= 500) {
      ctx.waitUntil(
        Promise.all([
          recordOperationalMetric(env.WEDDING_DATA, "errors"),
          recordOperationalIncident(env.WEDDING_DATA, {
            source: "http",
            severity: response.status >= 503 ? "critical" : "error",
            code: "http_server_error",
            message: `接口返回 ${response.status}`,
            path: url.pathname,
            status: response.status,
          }),
        ]).then(() => undefined),
      );
    }
    return applySecurityHeaders(request, response);
  },
  async queue(
    batch: QueueBatch<VideoQueueMessage>,
    env: Env,
  ): Promise<void> {
    await consumeVideoQueue(batch, env);
  },
  async scheduled(
    controller: { cron: string; scheduledTime: number },
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    if (controller.cron === "0 1 * * *") {
      ctx.waitUntil(
        Promise.all([
          processAutomatedReminders(
            env,
            new Date(controller.scheduledTime),
          ).catch(async (error: unknown) => {
            await Promise.all([
              recordOperationalMetric(env.WEDDING_DATA, "reminderFailures"),
              recordOperationalIncident(env.WEDDING_DATA, {
                source: "cron-reminders",
                severity: "error",
                code: "reminder_cron_failed",
                message:
                  error instanceof Error ? error.message : "自动提醒任务失败",
              }),
            ]);
            return { scanned: 0, sent: 0, skipped: 0 };
          }),
          processScheduledAccountDeletions(
            env,
            new Date(controller.scheduledTime),
          ).catch(async (error: unknown) => {
            await recordOperationalIncident(env.WEDDING_DATA, {
              source: "cron-account-lifecycle",
              severity: "critical",
              code: "account_deletion_failed",
              message:
                error instanceof Error ? error.message : "账号清理任务失败",
            });
            return { completed: 0 };
          }),
        ]).then(([reminders]) => reminders),
      );
      return;
    }
    ctx.waitUntil(
      recoverStalledVideoJobs(env).catch(async (error: unknown) => {
        await recordOperationalIncident(env.WEDDING_DATA, {
          source: "cron-video-recovery",
          severity: "error",
          code: "video_recovery_failed",
          message:
            error instanceof Error ? error.message : "视频任务恢复失败",
        });
      }),
    );
  },
};

export default worker;
