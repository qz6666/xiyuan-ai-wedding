import { getCloudflareBinding } from "../cloudflare";
import { resolveDataScope } from "../data-scope";
import { appendAuditEntry } from "../collaboration";
import {
  createWorkspaceBackup,
  verifyWorkspaceIntegrity,
  withWorkspaceIntegrity,
  type BackupStore,
  type WorkspaceEnvelope,
} from "../backups";
import { recordOperationalIncident } from "../operations";
import {
  compareAndSwapWorkspaceRecord,
  deleteWorkspaceRecord,
  getDatabase,
  readWorkspaceRecord,
  writeWorkspaceRecord,
} from "../database";

type WorkspaceStore = BackupStore;

const MAX_WORKSPACE_BYTES = 20 * 1024 * 1024;
const WORKSPACE_OWNER_INDEX = "workspace:owners";

async function registerWorkspaceOwner(store: WorkspaceStore, ownerId: string) {
  const saved = await store.get(WORKSPACE_OWNER_INDEX);
  let owners: string[] = [];
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as unknown;
      if (Array.isArray(parsed)) {
        owners = parsed.filter(
          (item): item is string => typeof item === "string",
        );
      }
    } catch {
      owners = [];
    }
  }
  if (owners.includes(ownerId)) return;
  await store.put(
    WORKSPACE_OWNER_INDEX,
    JSON.stringify([ownerId, ...owners].slice(0, 10_000)),
  );
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function getStore() {
  return getCloudflareBinding<WorkspaceStore>("WEDDING_DATA");
}

export async function GET(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或提供有效同步码。" }, 401);

  const [store, db] = await Promise.all([getStore(), getDatabase()]);
  if (!store && !db) return json({ error: "云端存储尚未连接。" }, 503);

  const d1Record = db ? await readWorkspaceRecord(db, scope.id) : null;
  const saved = d1Record?.envelope || (store ? await store.get(scope.workspaceKey) : null);
  if (!saved) {
    return json({
      data: null,
      storage: db ? "cloud-d1" : "cloud-kv",
      scope: scope.authenticated ? "account" : "sync-code",
    });
  }

  try {
    const envelope = JSON.parse(saved) as WorkspaceEnvelope;
    envelope.revision = d1Record?.revision || envelope.revision || 1;
    if (!(await verifyWorkspaceIntegrity(envelope))) {
      await recordOperationalIncident(store, {
        source: "workspace",
        severity: "critical",
        code: "workspace_checksum_mismatch",
        message: "工作区完整性校验失败，已停止读取。",
        path: scope.workspaceKey,
        status: 500,
      });
      return json(
        { error: "云端备婚资料完整性校验失败，请从历史备份恢复。" },
        500,
      );
    }
    if (db && !d1Record) {
      await writeWorkspaceRecord(db, {
        scopeId: scope.id,
        ownerId: scope.ownerId,
        envelope: saved,
        checksum: envelope.checksum || "",
        version: envelope.version || 2,
        revision: envelope.revision || 1,
        updatedAt: envelope.updatedAt,
      });
    }
    return json({
      data: envelope,
      storage: d1Record || db ? "cloud-d1" : "cloud-kv",
      scope: scope.authenticated ? "account" : "sync-code",
    });
  } catch {
    return json({ error: "云端备婚资料损坏，请联系管理员恢复备份。" }, 500);
  }
}

export async function PUT(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或提供有效同步码。" }, 401);
  if (!scope.canWrite) return json({ error: "当前角色只有查看权限。" }, 403);

  const [store, db] = await Promise.all([getStore(), getDatabase()]);
  if (!store && !db) return json({ error: "云端存储尚未连接。" }, 503);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_WORKSPACE_BYTES) {
    return json({ error: "备婚资料超过云端保存上限，请先清理较大的素材。" }, 413);
  }

  let body: Partial<WorkspaceEnvelope>;
  try {
    body = JSON.parse(raw) as Partial<WorkspaceEnvelope>;
  } catch {
    return json({ error: "备婚资料格式无效。" }, 400);
  }
  if (!body.workspace || typeof body.workspace !== "object") {
    return json({ error: "缺少可保存的备婚资料。" }, 400);
  }

  const expectedRevisionHeader = request.headers.get("if-match");
  const forceOverwrite = request.headers.get("x-force-overwrite") === "1";
  const expectedRevision =
    expectedRevisionHeader === null
      ? null
      : Number(expectedRevisionHeader.replace(/^W\//, "").replaceAll('"', ""));
  if (
    expectedRevision !== null &&
    (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
  ) {
    return json({ error: "云端修订号格式无效。" }, 400);
  }

  const d1Record = db ? await readWorkspaceRecord(db, scope.id) : null;
  const kvRecord = store ? await store.get(scope.workspaceKey) : null;
  const currentSaved = d1Record?.envelope || kvRecord;
  let currentRevision = d1Record?.revision || 0;
  let currentUpdatedAt = d1Record?.updatedAt;
  if (currentSaved && !currentRevision) {
    try {
      const currentEnvelope = JSON.parse(currentSaved) as WorkspaceEnvelope;
      currentRevision = currentEnvelope.revision || 1;
      currentUpdatedAt = currentEnvelope.updatedAt;
    } catch {
      currentRevision = 1;
    }
  }
  if (
    !forceOverwrite &&
    expectedRevision !== null &&
    expectedRevision !== currentRevision
  ) {
    return json(
      {
        error: "云端资料已在其他页面更新，请先选择载入云端或保留本机版本。",
        code: "workspace_conflict",
        currentRevision,
        updatedAt: currentUpdatedAt,
      },
      409,
    );
  }

  const envelope = await withWorkspaceIntegrity({
    workspace: body.workspace,
    usage: body.usage ?? null,
    updatedAt: new Date().toISOString(),
    revision: currentRevision + 1,
  });
  if (currentSaved && store) {
    await createWorkspaceBackup(
      store,
      scope.id,
      scope.workspaceKey,
      currentSaved,
      "autosave",
    );
  }
  const serialized = JSON.stringify(envelope);
  const recordInput = {
    scopeId: scope.id,
    ownerId: scope.ownerId,
    envelope: serialized,
    checksum: envelope.checksum || "",
    version: envelope.version || 2,
    revision: envelope.revision || 1,
    updatedAt: envelope.updatedAt,
  };
  if (db) {
    const written =
      forceOverwrite || expectedRevision === null
        ? (await writeWorkspaceRecord(db, recordInput), true)
        : await compareAndSwapWorkspaceRecord(
            db,
            recordInput,
            expectedRevision,
          );
    if (!written) {
      const latest = await readWorkspaceRecord(db, scope.id);
      return json(
        {
          error: "云端资料刚刚被其他页面更新，请重新选择保存方式。",
          code: "workspace_conflict",
          currentRevision: latest?.revision || currentRevision,
          updatedAt: latest?.updatedAt,
        },
        409,
      );
    }
  }
  if (store) await store.put(scope.workspaceKey, serialized);
  if (store && scope.user && scope.ownerId) {
    await registerWorkspaceOwner(store, scope.ownerId);
    await appendAuditEntry(
      store,
      scope.ownerId,
      scope.user,
      "保存工作区",
      "更新了备婚资料",
    );
  }
  return json({
    saved: true,
    revision: envelope.revision,
    updatedAt: envelope.updatedAt,
    storage: db ? "cloud-d1" : "cloud-kv",
    scope: scope.authenticated ? "account" : "sync-code",
  });
}

export async function DELETE(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或提供有效同步码。" }, 401);
  if (scope.role && scope.role !== "owner") {
    return json({ error: "只有空间拥有者可以删除云端工作区。" }, 403);
  }

  const [store, db] = await Promise.all([getStore(), getDatabase()]);
  if (!store && !db) return json({ error: "云端存储尚未连接。" }, 503);

  const existing = store ? await store.get(scope.workspaceKey) : null;
  if (existing && store) {
    await createWorkspaceBackup(
      store,
      scope.id,
      scope.workspaceKey,
      existing,
      "delete",
    );
  }
  await Promise.all([
    store?.delete(scope.workspaceKey),
    db ? deleteWorkspaceRecord(db, scope.id) : Promise.resolve(),
  ]);
  return json({ deleted: true, backupCreated: Boolean(existing) });
}
