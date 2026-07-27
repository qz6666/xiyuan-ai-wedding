import { getCloudflareBinding } from "../../cloudflare";
import { resolveDataScope } from "../../data-scope";

type R2ObjectLike = {
  arrayBuffer(): Promise<ArrayBuffer>;
  etag?: string;
  httpMetadata?: {
    contentType?: string;
  };
  size: number;
};

type R2BucketLike = {
  get(key: string): Promise<R2ObjectLike | null>;
};

function getBucket() {
  return getCloudflareBinding<R2BucketLike>("MEDIA_BUCKET");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const scope = await resolveDataScope(request);
  const legacyWorkspace = url.searchParams.get("workspace")?.trim().toLowerCase() || "";
  const allowedPrefix =
    scope?.mediaPrefix ||
    (/^[a-z0-9-]{16,80}$/i.test(legacyWorkspace) ? legacyWorkspace : "");
  if (!allowedPrefix) {
    return Response.json({ error: "请先登录或提供有效同步码。" }, { status: 401 });
  }
  if (
    !key.startsWith(`${allowedPrefix}/`) ||
    !/^[a-z0-9-]{16,80}\/[a-f0-9-]+\.(pdf|webp|png|jpg|mp4)$/i.test(key)
  ) {
    return Response.json({ error: "素材编号无效。" }, { status: 400 });
  }

  const bucket = await getBucket();
  if (!bucket) {
    return Response.json({ error: "云端素材存储尚未连接。" }, { status: 503 });
  }

  const object = await bucket.get(key);
  if (!object) return Response.json({ error: "素材不存在或已删除。" }, { status: 404 });

  const headers = new Headers({
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=3600",
    "content-length": String(object.size),
    "content-type": object.httpMetadata?.contentType || "application/octet-stream",
  });
  if (object.etag) headers.set("etag", object.etag);

  return new Response(await object.arrayBuffer(), { headers });
}
