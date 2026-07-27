import {
  verifyWorkspaceIntegrity,
  type WorkspaceEnvelope,
} from "./backups";
import {
  readWorkspaceRecord,
  writeWorkspaceRecord,
  type D1DatabaseLike,
} from "./database";

export type MigrationStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export type MigrationReport = {
  kind: "workspace-migration" | "recovery-drill";
  startedAt: string;
  completedAt: string;
  scanned: number;
  migrated: number;
  current: number;
  recoverable: number;
  missing: number;
  corrupted: number;
};

const LAST_REPORT_KEY = "migration:last-report";

async function readArray<T>(store: MigrationStore, key: string) {
  const saved = await store.get(key);
  if (!saved) return [] as T[];
  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function emptyReport(kind: MigrationReport["kind"]): MigrationReport {
  const now = new Date().toISOString();
  return {
    kind,
    startedAt: now,
    completedAt: now,
    scanned: 0,
    migrated: 0,
    current: 0,
    recoverable: 0,
    missing: 0,
    corrupted: 0,
  };
}

async function saveReport(store: MigrationStore, report: MigrationReport) {
  report.completedAt = new Date().toISOString();
  await store.put(LAST_REPORT_KEY, JSON.stringify(report));
  return report;
}

export async function readLastMigrationReport(store: MigrationStore) {
  const saved = await store.get(LAST_REPORT_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as MigrationReport;
  } catch {
    return null;
  }
}

export async function migrateOwnerWorkspaces(
  store: MigrationStore,
  db: D1DatabaseLike,
) {
  const report = emptyReport("workspace-migration");
  const owners = await readArray<string>(store, "workspace:owners");
  for (const ownerId of owners.slice(0, 10_000)) {
    report.scanned += 1;
    const saved = await store.get(`workspace:user:${ownerId}`);
    if (!saved) {
      report.missing += 1;
      continue;
    }
    let envelope: WorkspaceEnvelope;
    try {
      envelope = JSON.parse(saved) as WorkspaceEnvelope;
    } catch {
      report.corrupted += 1;
      continue;
    }
    if (!(await verifyWorkspaceIntegrity(envelope))) {
      report.corrupted += 1;
      continue;
    }
    const scopeId = `user-${ownerId}`;
    const existing = await readWorkspaceRecord(db, scopeId);
    if (existing?.checksum && existing.checksum === envelope.checksum) {
      report.current += 1;
      continue;
    }
    await writeWorkspaceRecord(db, {
      scopeId,
      ownerId,
      envelope: saved,
      checksum: envelope.checksum || "",
      version: envelope.version || 2,
      revision: envelope.revision || 1,
      updatedAt: envelope.updatedAt,
    });
    report.migrated += 1;
  }
  return saveReport(store, report);
}

export async function runBackupRecoveryDrill(store: MigrationStore) {
  const report = emptyReport("recovery-drill");
  const owners = await readArray<string>(store, "workspace:owners");
  for (const ownerId of owners.slice(0, 10_000)) {
    report.scanned += 1;
    const scopeId = `user-${ownerId}`;
    const index = await readArray<Array<{ id?: string }>[number]>(
      store,
      `workspace:backup-index:${scopeId}`,
    );
    const snapshotId = index.find((item) => typeof item.id === "string")?.id;
    if (!snapshotId) {
      report.missing += 1;
      continue;
    }
    const saved = await store.get(`workspace:backup:${scopeId}:${snapshotId}`);
    if (!saved) {
      report.missing += 1;
      continue;
    }
    try {
      const backup = JSON.parse(saved) as { envelope?: WorkspaceEnvelope };
      if (
        !backup.envelope ||
        !(await verifyWorkspaceIntegrity(backup.envelope))
      ) {
        report.corrupted += 1;
        continue;
      }
      report.recoverable += 1;
    } catch {
      report.corrupted += 1;
    }
  }
  return saveReport(store, report);
}
