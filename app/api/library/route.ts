import { getCloudflareBinding } from "../cloudflare";
import { resolveDataScope } from "../data-scope";

type R2BucketLike = {
  delete(key: string): Promise<void>;
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
};

const MAX_MEDIA_BYTES = 100 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function getBucket() {
  return getCloudflareBinding<R2BucketLike>("MEDIA_BUCKET");
}

function extensionFor(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  return "webp";
}

export async function POST(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或提供有效同步码。" }, 401);
  if (!scope.canWrite) return json({ error: "当前角色只有查看权限。" }, 403);

  const bucket = await getBucket();
  if (!bucket) return json({ error: "云端素材存储尚未连接。" }, 503);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_MEDIA_BYTES) {
    return json({ error: "单个素材不能超过 100MB。" }, 413);
  }

  const mimeType = request.headers.get("content-type")?.split(";")[0] || "";
  if (
    ![
      "application/pdf",
      "image/webp",
      "image/png",
      "image/jpeg",
      "video/mp4",
    ].includes(mimeType)
  ) {
    return json({ error: "仅支持 PDF、WebP、PNG、JPG 和 MP4 文件。" }, 415);
  }

  const content = await request.arrayBuffer();
  if (content.byteLength === 0) return json({ error: "素材内容为空。" }, 400);
  if (content.byteLength > MAX_MEDIA_BYTES) {
    return json({ error: "单个素材不能超过 100MB。" }, 413);
  }

  const key = `${scope.mediaPrefix}/${crypto.randomUUID()}.${extensionFor(mimeType)}`;
  await bucket.put(key, content, {
    httpMetadata: {
      contentType: mimeType,
    },
  });

  return json({
    key,
    contentUrl: `/api/library/content?key=${encodeURIComponent(key)}${
      scope.authenticated
        ? ""
        : `&workspace=${encodeURIComponent(scope.mediaPrefix)}`
    }`,
    size: content.byteLength,
    storage: "cloud-r2",
  });
}

export async function DELETE(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或提供有效同步码。" }, 401);
  if (!scope.canWrite) return json({ error: "当前角色只有查看权限。" }, 403);

  const bucket = await getBucket();
  if (!bucket) return json({ error: "云端素材存储尚未连接。" }, 503);

  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key.startsWith(`${scope.mediaPrefix}/`) || key.includes("..")) {
    return json({ error: "素材编号无效。" }, 400);
  }
  await bucket.delete(key);
  return json({ deleted: true });
}
