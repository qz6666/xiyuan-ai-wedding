import {
  deleteAuthUserRecords,
  getAuthStore,
  requestUser,
  type AuthStore,
  type AuthUser,
} from "./auth";
import {
  ensureDatabaseSchema,
  getDatabase,
  type D1DatabaseLike,
} from "./database";

export type AccountDeletion = {
  userId: string;
  email: string;
  requestedAt: string;
  scheduledFor: string;
  status: "pending" | "cancelled" | "completed";
};

type LifecycleStore = AuthStore;

type MediaBucket = {
  delete(keys: string | string[]): Promise<void>;
  list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    objects: Array<{ key: string }>;
    truncated: boolean;
    cursor?: string;
  }>;
};

export type AccountLifecycleEnv = {
  DB?: D1DatabaseLike;
  WEDDING_DATA?: LifecycleStore;
  MEDIA_BUCKET?: MediaBucket;
};

const DELETION_INDEX = "account:deletions:index";
const DELETION_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

function deletionKey(userId: string) {
  return `account:deletion:${userId}`;
}

async function readJson<T>(
  store: LifecycleStore,
  key: string,
  fallback: T,
) {
  const saved = await store.get(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

async function writeDeletionToDatabase(
  db: D1DatabaseLike,
  deletion: AccountDeletion,
) {
  await ensureDatabaseSchema(db);
  await db
    .prepare(
      `INSERT INTO account_deletions
        (user_id, email, requested_at, scheduled_for, status)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        requested_at = excluded.requested_at,
        scheduled_for = excluded.scheduled_for,
        status = excluded.status`,
    )
    .bind(
      deletion.userId,
      deletion.email,
      deletion.requestedAt,
      deletion.scheduledFor,
      deletion.status,
    )
    .run();
}

async function readDeletion(
  store: LifecycleStore | undefined,
  db: D1DatabaseLike | undefined,
  userId: string,
) {
  if (db) {
    await ensureDatabaseSchema(db);
    const row = await db
      .prepare(
        `SELECT user_id AS userId, email, requested_at AS requestedAt,
          scheduled_for AS scheduledFor, status
         FROM account_deletions WHERE user_id = ?`,
      )
      .bind(userId)
      .first<AccountDeletion>();
    if (row) return row;
  }
  return store
    ? readJson<AccountDeletion | null>(store, deletionKey(userId), null)
    : null;
}

async function lifecycleContext(request: Request) {
  const [user, store, db] = await Promise.all([
    requestUser(request),
    getAuthStore(),
    getDatabase(),
  ]);
  if (!user) throw new Error("请先登录。");
  if (!store && !db) throw new Error("账号生命周期存储尚未连接。");
  return { user, store, db };
}

export async function accountLifecycleOverview(request: Request) {
  const { user, store, db } = await lifecycleContext(request);
  return {
    deletion: await readDeletion(store, db, user.id),
    coolingOffDays: 7,
    requiresConfirmation: "注销喜缘账号",
  };
}

export async function requestAccountDeletion(
  request: Request,
  confirmation: unknown,
) {
  const { user, store, db } = await lifecycleContext(request);
  if (confirmation !== "注销喜缘账号") {
    throw new Error("请输入“注销喜缘账号”确认本次申请。");
  }
  const now = new Date();
  const deletion: AccountDeletion = {
    userId: user.id,
    email: user.email,
    requestedAt: now.toISOString(),
    scheduledFor: new Date(now.getTime() + DELETION_DELAY_MS).toISOString(),
    status: "pending",
  };
  if (store) {
    const index = await readJson<string[]>(store, DELETION_INDEX, []);
    await Promise.all([
      store.put(deletionKey(user.id), JSON.stringify(deletion)),
      store.put(
        DELETION_INDEX,
        JSON.stringify([user.id, ...index.filter((id) => id !== user.id)]),
      ),
    ]);
  }
  if (db) await writeDeletionToDatabase(db, deletion);
  return deletion;
}

export async function cancelAccountDeletion(request: Request) {
  const { user, store, db } = await lifecycleContext(request);
  const current = await readDeletion(store, db, user.id);
  if (!current || current.status !== "pending") {
    throw new Error("当前没有待执行的账号注销申请。");
  }
  const cancelled: AccountDeletion = { ...current, status: "cancelled" };
  await Promise.all([
    store?.put(deletionKey(user.id), JSON.stringify(cancelled)),
    db ? writeDeletionToDatabase(db, cancelled) : Promise.resolve(),
  ]);
  return cancelled;
}

async function removeFromStringIndex(
  store: LifecycleStore,
  key: string,
  value: string,
) {
  const index = await readJson<string[]>(store, key, []);
  await store.put(key, JSON.stringify(index.filter((item) => item !== value)));
}

function previousMonths(count: number) {
  const result: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  for (let index = 0; index < count; index += 1) {
    result.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return result;
}

async function purgeMedia(bucket: MediaBucket | undefined, userId: string) {
  if (!bucket) return 0;
  const prefix = `user-${userId}/`;
  let cursor: string | undefined;
  let deleted = 0;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 500 });
    const keys = page.objects.map((item) => item.key);
    if (keys.length) {
      await bucket.delete(keys);
      deleted += keys.length;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return deleted;
}

async function purgeKvData(
  store: LifecycleStore,
  user: Pick<AuthUser, "id" | "email">,
) {
  const scopeId = `user-${user.id}`;
  const [backupIndex, videoIds, inviteIds, members, usageRecords] =
    await Promise.all([
      readJson<Array<{ id?: string }>>(
        store,
        `workspace:backup-index:${scopeId}`,
        [],
      ),
      readJson<string[]>(store, `video-jobs:${scopeId}`, []),
      readJson<string[]>(store, `collab:invites:${user.id}`, []),
      readJson<Array<{ userId?: string }>>(
        store,
        `collab:members:${user.id}`,
        [],
      ),
      Promise.all(
        previousMonths(24).map(async (month) => ({
          month,
          record: await readJson<{
            events?: Array<{ id?: string }>;
          } | null>(store, `ai:usage:${user.id}:${month}`, null),
        })),
      ),
    ]);
  const activeReferences = await readJson<
    Array<{ scopeId?: string; id?: string }>
  >(store, "video-jobs:active", []);
  const activeWorkspace = await readJson<{ ownerId?: string } | null>(
    store,
    `collab:active:${user.id}`,
    null,
  );
  if (activeWorkspace?.ownerId && activeWorkspace.ownerId !== user.id) {
    const ownerMembers = await readJson<Array<{ userId?: string }>>(
      store,
      `collab:members:${activeWorkspace.ownerId}`,
      [],
    );
    await store.put(
      `collab:members:${activeWorkspace.ownerId}`,
      JSON.stringify(ownerMembers.filter((item) => item.userId !== user.id)),
    );
  }

  const keys = [
    `workspace:user:${user.id}`,
    `workspace:backup-index:${scopeId}`,
    `video-jobs:${scopeId}`,
    `collab:active:${user.id}`,
    `collab:members:${user.id}`,
    `collab:owner:${user.id}`,
    `collab:invites:${user.id}`,
    `collab:audit:${user.id}`,
    `billing:${user.id}`,
    `notifications:${user.id}`,
    `notification-preferences:${user.id}`,
    `privacy:consent:${user.id}`,
    ...backupIndex
      .filter((item) => typeof item.id === "string")
      .map((item) => `workspace:backup:${scopeId}:${item.id}`),
    ...videoIds.map((id) => `video-job:${scopeId}:${id}`),
    ...inviteIds.map((id) => `collab:invite:${id}`),
    ...usageRecords.flatMap(({ month, record }) => [
      `ai:usage:${user.id}:${month}`,
      `ai:bonus:${user.id}:${month}`,
      ...(record?.events || [])
        .filter((event) => typeof event.id === "string")
        .map((event) => `ai:reservation:${user.id}:${event.id}`),
    ]),
  ];
  await Promise.all([
    ...keys.map((key) => store.delete(key)),
    ...members
      .filter((member) => typeof member.userId === "string")
      .map((member) => store.delete(`collab:active:${member.userId}`)),
    store.put(
      "video-jobs:active",
      JSON.stringify(
        activeReferences.filter((item) => item.scopeId !== scopeId),
      ),
    ),
    removeFromStringIndex(store, "workspace:owners", user.id),
    ...previousMonths(24).map((month) =>
      removeFromStringIndex(store, `ai:usage:owners:${month}`, user.id),
    ),
  ]);
  await deleteAuthUserRecords(store, user);
}

export async function purgeAccount(
  env: AccountLifecycleEnv,
  deletion: AccountDeletion,
) {
  const user = { id: deletion.userId, email: deletion.email };
  await Promise.all([
    env.WEDDING_DATA
      ? purgeKvData(env.WEDDING_DATA, user)
      : Promise.resolve(),
    purgeMedia(env.MEDIA_BUCKET, deletion.userId),
  ]);
  if (env.DB) {
    await ensureDatabaseSchema(env.DB);
    await env.DB.batch([
      env.DB
        .prepare("DELETE FROM workspace_records WHERE scope_id = ?")
        .bind(`user-${deletion.userId}`),
      env.DB
        .prepare("DELETE FROM privacy_consents WHERE user_id = ?")
        .bind(deletion.userId),
      env.DB
        .prepare("DELETE FROM guest_invitations WHERE owner_id = ?")
        .bind(deletion.userId),
      env.DB
        .prepare("DELETE FROM account_deletions WHERE user_id = ?")
        .bind(deletion.userId),
    ]);
  }
  await env.WEDDING_DATA?.delete(deletionKey(deletion.userId));
  if (env.WEDDING_DATA) {
    await removeFromStringIndex(
      env.WEDDING_DATA,
      DELETION_INDEX,
      deletion.userId,
    );
  }
}

export async function processScheduledAccountDeletions(
  env: AccountLifecycleEnv,
  now = new Date(),
) {
  const records = new Map<string, AccountDeletion>();
  if (env.DB) {
    await ensureDatabaseSchema(env.DB);
    const result = await env.DB
      .prepare(
        `SELECT user_id AS userId, email, requested_at AS requestedAt,
          scheduled_for AS scheduledFor, status
         FROM account_deletions
         WHERE status = 'pending' AND scheduled_for <= ? LIMIT 50`,
      )
      .bind(now.toISOString())
      .all<AccountDeletion>();
    for (const record of result.results || []) records.set(record.userId, record);
  }
  if (env.WEDDING_DATA) {
    const ids = await readJson<string[]>(
      env.WEDDING_DATA,
      DELETION_INDEX,
      [],
    );
    for (const id of ids.slice(0, 500)) {
      const record = await readJson<AccountDeletion | null>(
        env.WEDDING_DATA,
        deletionKey(id),
        null,
      );
      if (
        record?.status === "pending" &&
        new Date(record.scheduledFor).getTime() <= now.getTime()
      ) {
        records.set(record.userId, record);
      }
    }
  }
  let completed = 0;
  for (const record of records.values()) {
    await purgeAccount(env, record);
    completed += 1;
  }
  return { completed };
}
