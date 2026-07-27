import { getCloudflareBinding } from "./cloudflare";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  isAdmin?: boolean;
};

export type AuthUserSummary = AuthUser & {
  createdAt: string;
};

export type AuthStore = {
  delete(key: string): Promise<void>;
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: {
      expirationTtl?: number;
    },
  ): Promise<void>;
};

type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  iterations: number;
  passwordHash: string;
  salt: string;
  emailVerified?: boolean;
  credentialVersion?: number;
};

type StoredSession = AuthUser & {
  sessionId?: string;
  credentialVersion: number;
  createdAt?: string;
  expiresAt: string;
  device?: string;
  ipHint?: string;
};

export type AuthSessionSummary = {
  id: string;
  createdAt: string;
  expiresAt: string;
  device: string;
  ipHint: string;
  current: boolean;
};

type StoredSessionIndexItem = Omit<AuthSessionSummary, "current"> & {
  tokenHash: string;
};

type StoredAuthCode = {
  attempts: number;
  codeHash: string;
  expiresAt: string;
};

type CodePurpose = "verify" | "reset";

const SESSION_COOKIE = "xiyuan_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const AUTH_CODE_SECONDS = 10 * 60;
const AUTH_CODE_COOLDOWN_SECONDS = 60;
const PASSWORD_ITERATIONS = 210_000;
const MAX_CODE_ATTEMPTS = 5;
const AUTH_USER_INDEX = "auth:users";
const AUTH_SESSION_INDEX_PREFIX = "auth:sessions:";
const MAX_USER_SESSIONS = 12;
const MAX_INDEXED_USERS = 10_000;

export class AuthError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 401, code?: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export function authJson(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...(headers || {}),
    },
  });
}

export function getAuthStore() {
  return getCloudflareBinding<AuthStore>("WEDDING_DATA");
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") throw new AuthError("请输入邮箱地址。", 400);
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    throw new AuthError("邮箱地址格式无效。", 400);
  }
  return email;
}

function normalizePassword(value: unknown) {
  if (typeof value !== "string" || value.length < 8 || value.length > 128) {
    throw new AuthError("密码需要 8 至 128 个字符。", 400);
  }
  return value;
}

function normalizeDisplayName(value: unknown, email: string) {
  if (typeof value !== "string" || !value.trim()) return email.split("@")[0].slice(0, 30);
  const displayName = value.trim().slice(0, 30);
  if (displayName.length < 2) throw new AuthError("称呼至少需要 2 个字符。", 400);
  return displayName;
}

async function passwordDigest(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    256,
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function sessionCookie(request: Request, token: string, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function configuredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminUser(user: Pick<AuthUser, "email"> | null) {
  return Boolean(user && configuredAdminEmails().has(user.email.toLowerCase()));
}

function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified !== false,
    isAdmin: isAdminUser(user),
  };
}

function userCredentialVersion(user: StoredUser) {
  return Math.max(1, user.credentialVersion || 1);
}

async function readUser(store: AuthStore, email: string) {
  const saved = await store.get(`auth:user:${await sha256(email)}`);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as StoredUser;
  } catch {
    throw new AuthError("账号资料异常，请联系管理员。", 500);
  }
}

async function writeUser(store: AuthStore, user: StoredUser) {
  await store.put(`auth:user:${await sha256(user.email)}`, JSON.stringify(user));
  let users: AuthUserSummary[] = [];
  const saved = await store.get(AUTH_USER_INDEX);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as unknown;
      if (Array.isArray(parsed)) users = parsed as AuthUserSummary[];
    } catch {
      users = [];
    }
  }
  const summary: AuthUserSummary = {
    ...toAuthUser(user),
    createdAt: user.createdAt,
  };
  await store.put(
    AUTH_USER_INDEX,
    JSON.stringify(
      [summary, ...users.filter((item) => item.id !== user.id)].slice(
        0,
        MAX_INDEXED_USERS,
      ),
    ),
  );
}

export async function listAuthUsers(store?: AuthStore | null) {
  const target = store || (await getAuthStore());
  if (!target) return [] as AuthUserSummary[];
  const saved = await target.get(AUTH_USER_INDEX);
  if (!saved) return [] as AuthUserSummary[];
  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed)
      ? (parsed as AuthUserSummary[]).map((user) => ({
          ...user,
          isAdmin: isAdminUser(user),
        }))
      : [];
  } catch {
    return [];
  }
}

async function createSession(request: Request, store: AuthStore, user: StoredUser) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64Url(tokenBytes);
  const tokenHash = await sha256(token);
  const sessionId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const session: StoredSession = {
    ...toAuthUser(user),
    sessionId,
    credentialVersion: userCredentialVersion(user),
    createdAt,
    expiresAt,
    device: describeDevice(request.headers.get("user-agent") || ""),
    ipHint: maskedIp(request),
  };
  await Promise.all([
    store.put(`auth:session:${tokenHash}`, JSON.stringify(session), {
      expirationTtl: SESSION_SECONDS,
    }),
    addSessionToIndex(store, user.id, {
      id: sessionId,
      tokenHash,
      createdAt,
      expiresAt,
      device: session.device || "未知设备",
      ipHint: session.ipHint || "本地或未知网络",
    }),
  ]);
  return sessionCookie(request, token);
}

function sessionIndexKey(userId: string) {
  return `${AUTH_SESSION_INDEX_PREFIX}${userId}`;
}

function describeDevice(userAgent: string) {
  if (!userAgent) return "未知设备";
  const platform = /Android/i.test(userAgent)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? "iPhone / iPad"
      : /Windows/i.test(userAgent)
        ? "Windows"
        : /Macintosh|Mac OS X/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "其他系统";
  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /Chrome\//i.test(userAgent)
      ? "Chrome"
      : /Firefox\//i.test(userAgent)
        ? "Firefox"
        : /Safari\//i.test(userAgent)
          ? "Safari"
          : "浏览器";
  return `${platform} · ${browser}`;
}

function maskedIp(request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  if (!ip) return "本地或未知网络";
  if (ip.includes(":")) {
    return `${ip.split(":").filter(Boolean).slice(0, 2).join(":")}::/32`;
  }
  const parts = ip.split(".");
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : "已隐藏网络";
}

async function readSessionIndex(store: AuthStore, userId: string) {
  const saved = await store.get(sessionIndexKey(userId));
  if (!saved) return [] as StoredSessionIndexItem[];
  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredSessionIndexItem[]) : [];
  } catch {
    return [];
  }
}

async function addSessionToIndex(
  store: AuthStore,
  userId: string,
  session: StoredSessionIndexItem,
) {
  const sessions = await readSessionIndex(store, userId);
  const next = [
    session,
    ...sessions.filter((item) => item.id !== session.id),
  ].slice(0, MAX_USER_SESSIONS);
  await store.put(sessionIndexKey(userId), JSON.stringify(next));
}

function authCodeKey(purpose: CodePurpose, emailHash: string) {
  return `auth:code:${purpose}:${emailHash}`;
}

function authRateKey(purpose: CodePurpose, emailHash: string) {
  return `auth:rate:${purpose}:${emailHash}`;
}

function generateSixDigitCode() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(random % 1_000_000).padStart(6, "0");
}

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

async function sendAuthEmail(email: string, code: string, purpose: CodePurpose) {
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  if (!apiKey) return false;
  const from = process.env.AUTH_EMAIL_FROM?.trim() || "喜缘 <no-reply@xiyuan.app>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: purpose === "verify" ? "喜缘邮箱验证码" : "喜缘密码重置验证码",
      html: [
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#3b0d14">',
        `<h2 style="margin:0 0 16px">喜缘${purpose === "verify" ? "邮箱验证" : "密码找回"}</h2>`,
        '<p style="color:#7a5350">本次操作验证码为：</p>',
        `<div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#ad1f35">${code}</div>`,
        '<p style="margin-top:18px;color:#7a5350">验证码 10 分钟内有效。如非本人操作，请忽略此邮件。</p>',
        "</div>",
      ].join(""),
    }),
  });
  if (!response.ok) {
    throw new AuthError("验证码邮件发送失败，请检查发信配置后重试。", 502, "email_delivery_failed");
  }
  return true;
}

async function issueAuthCode(
  request: Request,
  store: AuthStore,
  email: string,
  purpose: CodePurpose,
) {
  const emailHash = await sha256(email);
  if (await store.get(authRateKey(purpose, emailHash))) {
    throw new AuthError("验证码发送过于频繁，请 1 分钟后再试。", 429, "code_rate_limited");
  }
  const code = generateSixDigitCode();
  const record: StoredAuthCode = {
    attempts: 0,
    codeHash: await sha256(`${purpose}:${email}:${code}`),
    expiresAt: new Date(Date.now() + AUTH_CODE_SECONDS * 1000).toISOString(),
  };
  await Promise.all([
    store.put(authCodeKey(purpose, emailHash), JSON.stringify(record), {
      expirationTtl: AUTH_CODE_SECONDS,
    }),
    store.put(authRateKey(purpose, emailHash), "1", {
      expirationTtl: AUTH_CODE_COOLDOWN_SECONDS,
    }),
  ]);
  const local = isLocalRequest(request);
  const delivered = local ? false : await sendAuthEmail(email, code, purpose);
  return {
    delivered,
    devCode: local ? code : undefined,
  };
}

async function consumeAuthCode(
  store: AuthStore,
  email: string,
  purpose: CodePurpose,
  value: unknown,
) {
  if (typeof value !== "string" || !/^\d{6}$/.test(value.trim())) {
    throw new AuthError("请输入 6 位邮箱验证码。", 400, "invalid_code");
  }
  const emailHash = await sha256(email);
  const key = authCodeKey(purpose, emailHash);
  const saved = await store.get(key);
  if (!saved) throw new AuthError("验证码已失效，请重新获取。", 400, "expired_code");
  let record: StoredAuthCode;
  try {
    record = JSON.parse(saved) as StoredAuthCode;
  } catch {
    throw new AuthError("验证码已失效，请重新获取。", 400, "expired_code");
  }
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    await store.delete(key);
    throw new AuthError("验证码已过期，请重新获取。", 400, "expired_code");
  }
  const actualHash = await sha256(`${purpose}:${email}:${value.trim()}`);
  if (!constantTimeEqual(actualHash, record.codeHash)) {
    record.attempts += 1;
    if (record.attempts >= MAX_CODE_ATTEMPTS) {
      await store.delete(key);
      throw new AuthError("验证码错误次数过多，请重新获取。", 429, "code_attempts_exceeded");
    }
    await store.put(key, JSON.stringify(record), {
      expirationTtl: Math.max(
        60,
        Math.ceil((new Date(record.expiresAt).getTime() - Date.now()) / 1000),
      ),
    });
    throw new AuthError("邮箱验证码不正确。", 400, "invalid_code");
  }
  await store.delete(key);
}

export async function registerUser(
  request: Request,
  input: { email?: unknown; password?: unknown; displayName?: unknown },
) {
  const store = await getAuthStore();
  if (!store) throw new AuthError("账号服务尚未连接云端存储。", 503);
  const email = normalizeEmail(input.email);
  const password = normalizePassword(input.password);
  const displayName = normalizeDisplayName(input.displayName, email);
  const existing = await readUser(store, email);
  if (existing && existing.emailVerified !== false) {
    throw new AuthError("该邮箱已经注册，可以直接登录。", 409, "email_exists");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const user: StoredUser = {
    id: existing?.id || crypto.randomUUID(),
    email,
    displayName,
    salt: bytesToBase64Url(salt),
    passwordHash: await passwordDigest(password, salt, PASSWORD_ITERATIONS),
    iterations: PASSWORD_ITERATIONS,
    credentialVersion: userCredentialVersion(existing || ({} as StoredUser)),
    emailVerified: false,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  await writeUser(store, user);
  const delivery = await issueAuthCode(request, store, email, "verify");
  return {
    userId: user.id,
    email,
    verificationRequired: true,
    ...delivery,
  };
}

export async function requestVerificationCode(request: Request, emailValue: unknown) {
  const store = await getAuthStore();
  if (!store) throw new AuthError("账号服务尚未连接云端存储。", 503);
  const email = normalizeEmail(emailValue);
  const user = await readUser(store, email);
  if (!user) throw new AuthError("该邮箱尚未注册。", 404, "user_not_found");
  if (user.emailVerified !== false) {
    throw new AuthError("该邮箱已经完成验证，可以直接登录。", 409, "already_verified");
  }
  return { email, ...(await issueAuthCode(request, store, email, "verify")) };
}

export async function confirmVerification(
  request: Request,
  input: { email?: unknown; code?: unknown },
) {
  const store = await getAuthStore();
  if (!store) throw new AuthError("账号服务尚未连接云端存储。", 503);
  const email = normalizeEmail(input.email);
  const user = await readUser(store, email);
  if (!user) throw new AuthError("该邮箱尚未注册。", 404, "user_not_found");
  if (user.emailVerified === false) {
    await consumeAuthCode(store, email, "verify", input.code);
    user.emailVerified = true;
    await writeUser(store, user);
  }
  return {
    user: toAuthUser(user),
    cookie: await createSession(request, store, user),
  };
}

export async function loginUser(
  request: Request,
  input: { email?: unknown; password?: unknown },
) {
  const store = await getAuthStore();
  if (!store) throw new AuthError("账号服务尚未连接云端存储。", 503);
  const email = normalizeEmail(input.email);
  const password = normalizePassword(input.password);
  const user = await readUser(store, email);
  if (!user) throw new AuthError("邮箱或密码不正确。", 401, "invalid_credentials");

  const actualHash = await passwordDigest(
    password,
    base64UrlToBytes(user.salt),
    user.iterations,
  );
  if (!constantTimeEqual(actualHash, user.passwordHash)) {
    throw new AuthError("邮箱或密码不正确。", 401, "invalid_credentials");
  }
  if (user.emailVerified === false) {
    throw new AuthError("请先完成邮箱验证。", 403, "email_not_verified");
  }
  return {
    user: toAuthUser(user),
    cookie: await createSession(request, store, user),
  };
}

export async function requestPasswordReset(request: Request, emailValue: unknown) {
  const store = await getAuthStore();
  if (!store) throw new AuthError("账号服务尚未连接云端存储。", 503);
  const email = normalizeEmail(emailValue);
  const user = await readUser(store, email);
  if (!user) return { email, delivered: true };
  return { email, ...(await issueAuthCode(request, store, email, "reset")) };
}

export async function resetPassword(
  request: Request,
  input: { email?: unknown; code?: unknown; password?: unknown },
) {
  const store = await getAuthStore();
  if (!store) throw new AuthError("账号服务尚未连接云端存储。", 503);
  const email = normalizeEmail(input.email);
  const password = normalizePassword(input.password);
  const user = await readUser(store, email);
  if (!user) throw new AuthError("验证码无效或已过期。", 400, "invalid_code");
  await consumeAuthCode(store, email, "reset", input.code);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  user.salt = bytesToBase64Url(salt);
  user.passwordHash = await passwordDigest(password, salt, PASSWORD_ITERATIONS);
  user.iterations = PASSWORD_ITERATIONS;
  user.emailVerified = true;
  user.credentialVersion = userCredentialVersion(user) + 1;
  await writeUser(store, user);
  return {
    user: toAuthUser(user),
    cookie: await createSession(request, store, user),
  };
}

export async function requestUser(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const store = await getAuthStore();
  if (!store) return null;
  const tokenHash = await sha256(token);
  const saved = await store.get(`auth:session:${tokenHash}`);
  if (!saved) return null;

  try {
    const session = JSON.parse(saved) as StoredSession;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await store.delete(`auth:session:${tokenHash}`);
      return null;
    }
    const user = await readUser(store, session.email);
    if (
      !user ||
      user.emailVerified === false ||
      userCredentialVersion(user) !== Math.max(1, session.credentialVersion || 1)
    ) {
      await store.delete(`auth:session:${tokenHash}`);
      return null;
    }
    if (!session.sessionId) {
      session.sessionId = crypto.randomUUID();
      session.createdAt = session.createdAt || new Date().toISOString();
      session.device = describeDevice(request.headers.get("user-agent") || "");
      session.ipHint = maskedIp(request);
      await Promise.all([
        store.put(`auth:session:${tokenHash}`, JSON.stringify(session), {
          expirationTtl: Math.max(
            60,
            Math.ceil(
              (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
            ),
          ),
        }),
        addSessionToIndex(store, user.id, {
          id: session.sessionId,
          tokenHash,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          device: session.device,
          ipHint: session.ipHint,
        }),
      ]);
    }
    return toAuthUser(user);
  } catch {
    return null;
  }
}

export async function listUserSessions(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) throw new AuthError("请先登录。", 401);
  const store = await getAuthStore();
  if (!store) throw new AuthError("账号服务尚未连接云端存储。", 503);
  const tokenHash = await sha256(token);
  const currentSaved = await store.get(`auth:session:${tokenHash}`);
  if (!currentSaved) throw new AuthError("登录状态已失效。", 401);
  const current = JSON.parse(currentSaved) as StoredSession;
  const sessions = await readSessionIndex(store, current.id);
  const active = (
    await Promise.all(
      sessions.map(async (item) =>
        (await store.get(`auth:session:${item.tokenHash}`)) ? item : null,
      ),
    )
  ).filter((item): item is StoredSessionIndexItem => Boolean(item));
  if (active.length !== sessions.length) {
    await store.put(sessionIndexKey(current.id), JSON.stringify(active));
  }
  return active.map(
    ({ tokenHash: indexedTokenHash, ...session }): AuthSessionSummary => ({
      ...session,
      current: indexedTokenHash === tokenHash,
    }),
  );
}

export async function revokeUserSessions(
  request: Request,
  input: { action?: unknown; sessionId?: unknown },
) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) throw new AuthError("请先登录。", 401);
  const store = await getAuthStore();
  if (!store) throw new AuthError("账号服务尚未连接云端存储。", 503);
  const tokenHash = await sha256(token);
  const currentSaved = await store.get(`auth:session:${tokenHash}`);
  if (!currentSaved) throw new AuthError("登录状态已失效。", 401);
  const current = JSON.parse(currentSaved) as StoredSession;
  const sessions = await readSessionIndex(store, current.id);
  const targets =
    input.action === "revoke_others"
      ? sessions.filter((item) => item.tokenHash !== tokenHash)
      : sessions.filter(
          (item) =>
            item.id === input.sessionId && item.tokenHash !== tokenHash,
        );
  if (
    input.action !== "revoke_others" &&
    (typeof input.sessionId !== "string" || targets.length === 0)
  ) {
    throw new AuthError("设备会话不存在，或不能在这里退出当前设备。", 400);
  }
  await Promise.all(
    targets.map((item) => store.delete(`auth:session:${item.tokenHash}`)),
  );
  const targetIds = new Set(targets.map((item) => item.id));
  await store.put(
    sessionIndexKey(current.id),
    JSON.stringify(sessions.filter((item) => !targetIds.has(item.id))),
  );
  return { revoked: targets.length };
}

export async function deleteAuthUserRecords(
  store: AuthStore,
  user: Pick<AuthUser, "id" | "email">,
) {
  const sessions = await readSessionIndex(store, user.id);
  const emailHash = await sha256(user.email.toLowerCase());
  const users = await listAuthUsers(store);
  await Promise.all([
    ...sessions.map((session) =>
      store.delete(`auth:session:${session.tokenHash}`),
    ),
    store.delete(sessionIndexKey(user.id)),
    store.delete(`auth:user:${emailHash}`),
    store.delete(authCodeKey("verify", emailHash)),
    store.delete(authCodeKey("reset", emailHash)),
    store.delete(authRateKey("verify", emailHash)),
    store.delete(authRateKey("reset", emailHash)),
    store.put(
      AUTH_USER_INDEX,
      JSON.stringify(users.filter((item) => item.id !== user.id)),
    ),
  ]);
}

export async function destroySession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  const store = await getAuthStore();
  if (token && store) {
    const tokenHash = await sha256(token);
    const saved = await store.get(`auth:session:${tokenHash}`);
    await store.delete(`auth:session:${tokenHash}`);
    if (saved) {
      try {
        const session = JSON.parse(saved) as StoredSession;
        const sessions = await readSessionIndex(store, session.id);
        await store.put(
          sessionIndexKey(session.id),
          JSON.stringify(
            sessions.filter((item) => item.tokenHash !== tokenHash),
          ),
        );
      } catch {
        // The session itself is already revoked.
      }
    }
  }
  return sessionCookie(request, "", 0);
}
