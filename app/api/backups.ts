import { sha256 } from "./auth";

export type BackupStore = {
  delete(key: string): Promise<void>;
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

export type WorkspaceEnvelope = {
  updatedAt: string;
  usage: unknown;
  workspace: unknown;
  checksum?: string;
  revision?: number;
  version?: number;
};

type WorkspaceBackup = {
  id: string;
  scopeId: string;
  workspaceKey: string;
  reason: "autosave" | "delete" | "restore" | "manual";
  createdAt: string;
  checksum: string;
  envelope: WorkspaceEnvelope;
};

export type WorkspaceBackupSummary = Omit<WorkspaceBackup, "envelope">;

const BACKUP_TTL_SECONDS = 60 * 60 * 24 * 180;
const MAX_BACKUPS = 30;

function backupIndexKey(scopeId: string) {
  return `workspace:backup-index:${scopeId}`;
}

function backupKey(scopeId: string, id: string) {
  return `workspace:backup:${scopeId}:${id}`;
}

export async function workspaceChecksum(workspace: unknown) {
  return sha256(JSON.stringify(workspace));
}

export async function withWorkspaceIntegrity(
  envelope: Omit<WorkspaceEnvelope, "checksum" | "version">,
): Promise<WorkspaceEnvelope> {
  return {
    ...envelope,
    checksum: await workspaceChecksum(envelope.workspace),
    version: 2,
  };
}

export async function verifyWorkspaceIntegrity(envelope: WorkspaceEnvelope) {
  if (!envelope.checksum) return true;
  return envelope.checksum === (await workspaceChecksum(envelope.workspace));
}

async function readBackupIndex(store: BackupStore, scopeId: string) {
  const saved = await store.get(backupIndexKey(scopeId));
  if (!saved) return [] as WorkspaceBackupSummary[];
  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? (parsed as WorkspaceBackupSummary[]) : [];
  } catch {
    return [];
  }
}

export async function createWorkspaceBackup(
  store: BackupStore,
  scopeId: string,
  workspaceKey: string,
  raw: string,
  reason: WorkspaceBackup["reason"],
) {
  let envelope: WorkspaceEnvelope;
  try {
    envelope = JSON.parse(raw) as WorkspaceEnvelope;
  } catch {
    return null;
  }
  if (!envelope.workspace || typeof envelope.workspace !== "object") return null;
  const checksum =
    envelope.checksum || (await workspaceChecksum(envelope.workspace));
  const index = await readBackupIndex(store, scopeId);
  if (index[0]?.checksum === checksum && reason === "autosave") return index[0];

  const backup: WorkspaceBackup = {
    id: crypto.randomUUID(),
    scopeId,
    workspaceKey,
    reason,
    createdAt: new Date().toISOString(),
    checksum,
    envelope: {
      ...envelope,
      checksum,
      version: envelope.version || 2,
    },
  };
  const summary: WorkspaceBackupSummary = {
    id: backup.id,
    scopeId,
    workspaceKey,
    reason,
    createdAt: backup.createdAt,
    checksum,
  };
  const nextIndex = [
    summary,
    ...index.filter((item) => item.id !== backup.id),
  ].slice(0, MAX_BACKUPS);
  await Promise.all([
    store.put(backupKey(scopeId, backup.id), JSON.stringify(backup), {
      expirationTtl: BACKUP_TTL_SECONDS,
    }),
    store.put(backupIndexKey(scopeId), JSON.stringify(nextIndex)),
  ]);
  return summary;
}

export async function listWorkspaceBackups(
  store: BackupStore,
  scopeId: string,
) {
  return readBackupIndex(store, scopeId);
}

export async function restoreWorkspaceBackup(
  store: BackupStore,
  scopeId: string,
  workspaceKey: string,
  snapshotId: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(snapshotId)) {
    throw new Error("备份编号无效。");
  }
  const saved = await store.get(backupKey(scopeId, snapshotId));
  if (!saved) throw new Error("该备份不存在或已超过保留期。");
  let backup: WorkspaceBackup;
  try {
    backup = JSON.parse(saved) as WorkspaceBackup;
  } catch {
    throw new Error("备份内容损坏，无法恢复。");
  }
  if (backup.scopeId !== scopeId || backup.workspaceKey !== workspaceKey) {
    throw new Error("无权恢复该备份。");
  }
  if (!(await verifyWorkspaceIntegrity(backup.envelope))) {
    throw new Error("备份完整性校验失败，已停止恢复。");
  }
  const current = await store.get(workspaceKey);
  let currentRevision = 0;
  if (current) {
    try {
      const currentEnvelope = JSON.parse(current) as WorkspaceEnvelope;
      currentRevision = Math.max(0, currentEnvelope.revision || 1);
    } catch {
      currentRevision = 0;
    }
    await createWorkspaceBackup(
      store,
      scopeId,
      workspaceKey,
      current,
      "restore",
    );
  }
  const envelope = await withWorkspaceIntegrity({
    workspace: backup.envelope.workspace,
    usage: backup.envelope.usage ?? null,
    updatedAt: new Date().toISOString(),
    revision: currentRevision + 1,
  });
  await store.put(workspaceKey, JSON.stringify(envelope));
  return envelope;
}
