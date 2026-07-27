import { getCloudflareBinding } from "./cloudflare";

type D1Result<T = Record<string, unknown>> = {
  meta?: {
    changes?: number;
  };
  results?: T[];
  success?: boolean;
};

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
};

export type D1DatabaseLike = {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1Result[]>;
};

export type GuestInvitationRecord = {
  code: string;
  scopeId: string;
  workspaceKey: string;
  ownerId: string | null;
  guestId: number;
  guestName: string;
  relation: string;
  invitedCount: number;
  coupleNames: string;
  weddingDate: string;
  city: string;
  rsvp: "待确认" | "会到场" | "不参加";
  attendingCount: number;
  companion: number;
  dietary: string;
  message: string;
  createdAt: string;
  respondedAt: string | null;
};

let schemaReady: Promise<void> | null = null;

type WorkspaceRecordInput = {
  scopeId: string;
  ownerId: string | null;
  envelope: string;
  checksum: string;
  version: number;
  revision: number;
  updatedAt: string;
};

export async function getDatabase() {
  return getCloudflareBinding<D1DatabaseLike>("DB");
}

export async function ensureDatabaseSchema(db: D1DatabaseLike) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.batch([
        db.prepare(`
          CREATE TABLE IF NOT EXISTS workspace_records (
            scope_id TEXT PRIMARY KEY,
            owner_id TEXT,
            envelope TEXT NOT NULL,
            checksum TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 2,
            revision INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL
          )
        `),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS privacy_consents (
            user_id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            terms_version TEXT NOT NULL,
            privacy_version TEXT NOT NULL,
            accepted_at TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'web'
          )
        `),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS guest_invitations (
            code TEXT PRIMARY KEY,
            scope_id TEXT NOT NULL,
            workspace_key TEXT NOT NULL,
            owner_id TEXT,
            guest_id INTEGER NOT NULL,
            guest_name TEXT NOT NULL,
            relation TEXT NOT NULL,
            invited_count INTEGER NOT NULL DEFAULT 1,
            couple_names TEXT NOT NULL,
            wedding_date TEXT NOT NULL,
            city TEXT NOT NULL,
            rsvp TEXT NOT NULL DEFAULT '待确认',
            attending_count INTEGER NOT NULL DEFAULT 1,
            companion INTEGER NOT NULL DEFAULT 0,
            dietary TEXT NOT NULL DEFAULT '',
            message TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            responded_at TEXT
          )
        `),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS guest_invitations_scope_guest_idx ON guest_invitations(scope_id, guest_id)",
        ),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS account_deletions (
            user_id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            requested_at TEXT NOT NULL,
            scheduled_for TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending'
          )
        `),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS account_deletions_status_idx ON account_deletions(status, scheduled_for)",
        ),
      ]);
      const columns = await db
        .prepare("PRAGMA table_info(workspace_records)")
        .all<{ name: string }>();
      if (!columns.results?.some((column) => column.name === "revision")) {
        await db
          .prepare(
            "ALTER TABLE workspace_records ADD COLUMN revision INTEGER NOT NULL DEFAULT 1",
          )
          .run();
      }
    })().catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  await schemaReady;
}

const GUEST_INVITATION_SELECT = `SELECT
  code,
  scope_id AS scopeId,
  workspace_key AS workspaceKey,
  owner_id AS ownerId,
  guest_id AS guestId,
  guest_name AS guestName,
  relation,
  invited_count AS invitedCount,
  couple_names AS coupleNames,
  wedding_date AS weddingDate,
  city,
  rsvp,
  attending_count AS attendingCount,
  companion,
  dietary,
  message,
  created_at AS createdAt,
  responded_at AS respondedAt
 FROM guest_invitations`;

export async function readGuestInvitation(
  db: D1DatabaseLike,
  code: string,
) {
  await ensureDatabaseSchema(db);
  return db
    .prepare(`${GUEST_INVITATION_SELECT} WHERE code = ?`)
    .bind(code)
    .first<GuestInvitationRecord>();
}

export async function readGuestInvitationForGuest(
  db: D1DatabaseLike,
  scopeId: string,
  guestId: number,
) {
  await ensureDatabaseSchema(db);
  return db
    .prepare(
      `${GUEST_INVITATION_SELECT} WHERE scope_id = ? AND guest_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(scopeId, guestId)
    .first<GuestInvitationRecord>();
}

export async function listGuestInvitationsForScope(
  db: D1DatabaseLike,
  scopeId: string,
) {
  await ensureDatabaseSchema(db);
  const result = await db
    .prepare(
      `${GUEST_INVITATION_SELECT} WHERE scope_id = ? ORDER BY created_at DESC LIMIT 1000`,
    )
    .bind(scopeId)
    .all<GuestInvitationRecord>();
  return result.results || [];
}

export async function saveGuestInvitation(
  db: D1DatabaseLike,
  invitation: GuestInvitationRecord,
) {
  await ensureDatabaseSchema(db);
  await db
    .prepare(
      `INSERT INTO guest_invitations (
        code, scope_id, workspace_key, owner_id, guest_id, guest_name, relation,
        invited_count, couple_names, wedding_date, city, rsvp, attending_count,
        companion, dietary, message, created_at, responded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        guest_name = excluded.guest_name,
        relation = excluded.relation,
        invited_count = excluded.invited_count,
        couple_names = excluded.couple_names,
        wedding_date = excluded.wedding_date,
        city = excluded.city`,
    )
    .bind(
      invitation.code,
      invitation.scopeId,
      invitation.workspaceKey,
      invitation.ownerId,
      invitation.guestId,
      invitation.guestName,
      invitation.relation,
      invitation.invitedCount,
      invitation.coupleNames,
      invitation.weddingDate,
      invitation.city,
      invitation.rsvp,
      invitation.attendingCount,
      invitation.companion,
      invitation.dietary,
      invitation.message,
      invitation.createdAt,
      invitation.respondedAt,
    )
    .run();
}

export async function updateGuestInvitationResponse(
  db: D1DatabaseLike,
  input: {
    code: string;
    rsvp: "会到场" | "不参加";
    attendingCount: number;
    companion: boolean;
    dietary: string;
    message: string;
    respondedAt: string;
  },
) {
  await ensureDatabaseSchema(db);
  await db
    .prepare(
      `UPDATE guest_invitations SET
        rsvp = ?,
        attending_count = ?,
        companion = ?,
        dietary = ?,
        message = ?,
        responded_at = ?
       WHERE code = ?`,
    )
    .bind(
      input.rsvp,
      input.attendingCount,
      input.companion ? 1 : 0,
      input.dietary,
      input.message,
      input.respondedAt,
      input.code,
    )
    .run();
}

export async function deleteGuestInvitation(
  db: D1DatabaseLike,
  code: string,
) {
  await ensureDatabaseSchema(db);
  await db
    .prepare("DELETE FROM guest_invitations WHERE code = ?")
    .bind(code)
    .run();
}

export async function readWorkspaceRecord(db: D1DatabaseLike, scopeId: string) {
  await ensureDatabaseSchema(db);
  return db
    .prepare(
      "SELECT envelope, checksum, version, revision, updated_at AS updatedAt FROM workspace_records WHERE scope_id = ?",
    )
    .bind(scopeId)
    .first<{
      envelope: string;
      checksum: string;
      version: number;
      revision: number;
      updatedAt: string;
    }>();
}

export async function writeWorkspaceRecord(
  db: D1DatabaseLike,
  input: WorkspaceRecordInput,
) {
  await ensureDatabaseSchema(db);
  await db
    .prepare(
      `INSERT INTO workspace_records
        (scope_id, owner_id, envelope, checksum, version, revision, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(scope_id) DO UPDATE SET
        owner_id = excluded.owner_id,
        envelope = excluded.envelope,
        checksum = excluded.checksum,
        version = excluded.version,
        revision = excluded.revision,
        updated_at = excluded.updated_at`,
    )
    .bind(
      input.scopeId,
      input.ownerId,
      input.envelope,
      input.checksum,
      input.version,
      input.revision,
      input.updatedAt,
    )
    .run();
}

export async function compareAndSwapWorkspaceRecord(
  db: D1DatabaseLike,
  input: WorkspaceRecordInput,
  expectedRevision: number,
) {
  await ensureDatabaseSchema(db);
  if (expectedRevision === 0) {
    const result = await db
      .prepare(
        `INSERT INTO workspace_records
          (scope_id, owner_id, envelope, checksum, version, revision, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(scope_id) DO NOTHING`,
      )
      .bind(
        input.scopeId,
        input.ownerId,
        input.envelope,
        input.checksum,
        input.version,
        input.revision,
        input.updatedAt,
      )
      .run();
    return (result.meta?.changes || 0) > 0;
  }

  const result = await db
    .prepare(
      `UPDATE workspace_records SET
        owner_id = ?,
        envelope = ?,
        checksum = ?,
        version = ?,
        revision = ?,
        updated_at = ?
       WHERE scope_id = ? AND revision = ?`,
    )
    .bind(
      input.ownerId,
      input.envelope,
      input.checksum,
      input.version,
      input.revision,
      input.updatedAt,
      input.scopeId,
      expectedRevision,
    )
    .run();
  return (result.meta?.changes || 0) > 0;
}

export async function deleteWorkspaceRecord(
  db: D1DatabaseLike,
  scopeId: string,
) {
  await ensureDatabaseSchema(db);
  await db
    .prepare("DELETE FROM workspace_records WHERE scope_id = ?")
    .bind(scopeId)
    .run();
}
