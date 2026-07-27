import { getCloudflareBinding } from "../../cloudflare";
import { resolveDataScope } from "../../data-scope";
import {
  verifyWorkspaceIntegrity,
  type BackupStore,
  type WorkspaceEnvelope,
} from "../../backups";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或提供有效同步码。" }, 401);
  const store = await getCloudflareBinding<BackupStore>("WEDDING_DATA");
  if (!store) return json({ error: "云端备份存储尚未连接。" }, 503);
  const saved = await store.get(scope.workspaceKey);
  if (!saved) return json({ error: "当前没有可导出的云端资料。" }, 404);
  try {
    const envelope = JSON.parse(saved) as WorkspaceEnvelope;
    if (!(await verifyWorkspaceIntegrity(envelope))) {
      return json({ error: "资料完整性校验失败，已停止导出。" }, 500);
    }
    const exportedAt = new Date().toISOString();
    return new Response(
      JSON.stringify(
        {
          format: "xiyuan-workspace-export",
          version: 1,
          exportedAt,
          checksum: envelope.checksum,
          data: envelope,
        },
        null,
        2,
      ),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="xiyuan-workspace-${exportedAt.slice(0, 10)}.json"`,
          "cache-control": "no-store",
        },
      },
    );
  } catch {
    return json({ error: "云端资料格式损坏，无法导出。" }, 500);
  }
}
