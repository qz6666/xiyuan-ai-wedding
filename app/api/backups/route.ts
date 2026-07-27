import { getCloudflareBinding } from "../cloudflare";
import { resolveDataScope } from "../data-scope";
import {
  createWorkspaceBackup,
  listWorkspaceBackups,
  restoreWorkspaceBackup,
  type BackupStore,
} from "../backups";
import { getDatabase, writeWorkspaceRecord } from "../database";

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
  return json({
    retentionDays: 180,
    maximumVersions: 30,
    backups: await listWorkspaceBackups(store, scope.id),
  });
}

export async function POST(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或提供有效同步码。" }, 401);
  if (!scope.canWrite) return json({ error: "当前角色没有恢复权限。" }, 403);
  const store = await getCloudflareBinding<BackupStore>("WEDDING_DATA");
  if (!store) return json({ error: "云端备份存储尚未连接。" }, 503);
  try {
    const input = (await request.json()) as {
      action?: unknown;
      snapshotId?: unknown;
    };
    if (input.action === "create") {
      const current = await store.get(scope.workspaceKey);
      if (!current) return json({ error: "当前没有可备份的云端资料。" }, 404);
      const backup = await createWorkspaceBackup(
        store,
        scope.id,
        scope.workspaceKey,
        current,
        "manual",
      );
      return json({ created: true, backup });
    }
    if (input.action !== "restore" || typeof input.snapshotId !== "string") {
      return json({ error: "请选择需要恢复的备份版本。" }, 400);
    }
    const envelope = await restoreWorkspaceBackup(
      store,
      scope.id,
      scope.workspaceKey,
      input.snapshotId,
    );
    const db = await getDatabase();
    if (db) {
      await writeWorkspaceRecord(db, {
        scopeId: scope.id,
        ownerId: scope.ownerId,
        envelope: JSON.stringify(envelope),
        checksum: envelope.checksum || "",
        version: envelope.version || 2,
        revision: envelope.revision || 1,
        updatedAt: envelope.updatedAt,
      });
    }
    return json({
      restored: true,
      revision: envelope.revision || 1,
      updatedAt: envelope.updatedAt,
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "备份恢复失败。" },
      400,
    );
  }
}
