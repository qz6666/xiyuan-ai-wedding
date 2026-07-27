import { aiConfig } from "../ai-providers";
import { getCloudflareBinding } from "../cloudflare";
import { getDatabase } from "../database";

type HealthStore = {
  get(key: string): Promise<string | null>;
};

export async function GET() {
  const [store, database, mediaStorage, videoQueue] = await Promise.all([
    getCloudflareBinding<HealthStore>("WEDDING_DATA"),
    getDatabase(),
    getCloudflareBinding<unknown>("MEDIA_BUCKET"),
    getCloudflareBinding<unknown>("VIDEO_TASK_QUEUE"),
  ]);
  const config = aiConfig();
  return Response.json(
    {
      status: store && database && mediaStorage ? "healthy" : "degraded",
      services: {
        dataStore: Boolean(store),
        database: Boolean(database),
        mediaStorage: Boolean(mediaStorage),
        videoQueue: Boolean(videoQueue),
        deepSeek: Boolean(config.deepSeekApiKey),
        ark: Boolean(config.arkApiKey),
        email: Boolean(process.env.RESEND_API_KEY?.trim()),
        payments: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      },
      checkedAt: new Date().toISOString(),
    },
    {
      status: store ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
