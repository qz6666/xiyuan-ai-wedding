import { getAuthStore, requestUser, type AuthUser } from "./auth";
import {
  ensureDatabaseSchema,
  getDatabase,
  type D1DatabaseLike,
} from "./database";

export const TERMS_VERSION = "2026-07-24";
export const PRIVACY_VERSION = "2026-07-24";

export type PrivacyConsent = {
  userId: string;
  email: string;
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
  source: "registration" | "account";
};

type PrivacyStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

function consentKey(userId: string) {
  return `privacy:consent:${userId}`;
}

async function writeConsentToDatabase(
  db: D1DatabaseLike,
  consent: PrivacyConsent,
) {
  await ensureDatabaseSchema(db);
  await db
    .prepare(
      `INSERT INTO privacy_consents
        (user_id, email, terms_version, privacy_version, accepted_at, source)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        terms_version = excluded.terms_version,
        privacy_version = excluded.privacy_version,
        accepted_at = excluded.accepted_at,
        source = excluded.source`,
    )
    .bind(
      consent.userId,
      consent.email,
      consent.termsVersion,
      consent.privacyVersion,
      consent.acceptedAt,
      consent.source,
    )
    .run();
}

export async function recordPrivacyConsent(
  user: Pick<AuthUser, "id" | "email">,
  source: PrivacyConsent["source"],
) {
  const [store, db] = await Promise.all([getAuthStore(), getDatabase()]);
  if (!store && !db) throw new Error("隐私授权存储尚未连接。");
  const consent: PrivacyConsent = {
    userId: user.id,
    email: user.email,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedAt: new Date().toISOString(),
    source,
  };
  await Promise.all([
    store?.put(consentKey(user.id), JSON.stringify(consent)),
    db ? writeConsentToDatabase(db, consent) : Promise.resolve(),
  ]);
  return consent;
}

async function readPrivacyConsent(
  store: PrivacyStore | undefined,
  db: D1DatabaseLike | undefined,
  userId: string,
) {
  if (db) {
    await ensureDatabaseSchema(db);
    const row = await db
      .prepare(
        `SELECT user_id AS userId, email, terms_version AS termsVersion,
          privacy_version AS privacyVersion, accepted_at AS acceptedAt, source
         FROM privacy_consents WHERE user_id = ?`,
      )
      .bind(userId)
      .first<PrivacyConsent>();
    if (row) return row;
  }
  const saved = await store?.get(consentKey(userId));
  if (!saved) return null;
  try {
    return JSON.parse(saved) as PrivacyConsent;
  } catch {
    return null;
  }
}

export async function privacyOverview(request: Request) {
  const [user, store, db] = await Promise.all([
    requestUser(request),
    getAuthStore(),
    getDatabase(),
  ]);
  if (!user) throw new Error("请先登录。");
  const consent = await readPrivacyConsent(store, db, user.id);
  return {
    required: {
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    },
    consent,
    current:
      consent?.termsVersion === TERMS_VERSION &&
      consent.privacyVersion === PRIVACY_VERSION,
  };
}

export async function acceptCurrentPrivacy(request: Request) {
  const user = await requestUser(request);
  if (!user) throw new Error("请先登录。");
  return recordPrivacyConsent(user, "account");
}
