export type SecurityStore = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

type RatePolicy = {
  group: string;
  limit: number;
  windowSeconds: number;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const WEBHOOK_PATHS = new Set(["/api/billing/webhook"]);

function securityJson(body: unknown, status: number, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...(headers || {}),
    },
  });
}

async function shortHash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function ratePolicy(pathname: string, method: string): RatePolicy | null {
  if (!pathname.startsWith("/api/")) return null;
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/password") ||
    pathname.startsWith("/api/auth/verify")
  ) {
    return { group: "auth", limit: 30, windowSeconds: 60 };
  }
  if (
    method === "POST" &&
    (pathname.startsWith("/api/copywriting") ||
      pathname.startsWith("/api/media/image") ||
      pathname.startsWith("/api/media/portrait") ||
      pathname.startsWith("/api/media/video"))
  ) {
    return { group: "ai", limit: 30, windowSeconds: 60 };
  }
  if (MUTATING_METHODS.has(method)) {
    return { group: "write", limit: 120, windowSeconds: 60 };
  }
  return { group: "read", limit: 300, windowSeconds: 60 };
}

function requestFingerprint(request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  const session = request.headers.get("cookie") || "";
  const workspace = request.headers.get("x-workspace-id") || "";
  return `${ip}|${session.slice(0, 180)}|${workspace.slice(0, 80)}`;
}

async function enforceRateLimit(
  request: Request,
  store: SecurityStore,
  policy: RatePolicy,
) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowSeconds / policy.windowSeconds);
  const fingerprint = await shortHash(requestFingerprint(request));
  const key = `security:rate:${policy.group}:${fingerprint}:${bucket}`;
  const saved = await store.get(key);
  const count = Math.max(0, Number(saved) || 0) + 1;
  await store.put(key, String(count), {
    expirationTtl: policy.windowSeconds * 2,
  });
  if (count <= policy.limit) return null;

  const retryAfter =
    policy.windowSeconds - (nowSeconds % policy.windowSeconds);
  return securityJson(
    {
      error: "请求过于频繁，请稍后再试。",
      code: "rate_limited",
      retryAfter,
    },
    429,
    { "retry-after": String(retryAfter) },
  );
}

function validateMutationSource(request: Request) {
  const url = new URL(request.url);
  if (
    !MUTATING_METHODS.has(request.method.toUpperCase()) ||
    WEBHOOK_PATHS.has(url.pathname)
  ) {
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return securityJson(
      { error: "已拦截跨站操作请求。", code: "cross_site_request" },
      403,
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) {
    return securityJson(
      { error: "请求来源校验失败。", code: "invalid_origin" },
      403,
    );
  }
  return null;
}

export async function enforceRequestSecurity(
  request: Request,
  store?: SecurityStore,
) {
  const sourceError = validateMutationSource(request);
  if (sourceError) return sourceError;
  if (!store) return null;
  const url = new URL(request.url);
  const policy = ratePolicy(url.pathname, request.method.toUpperCase());
  if (!policy) return null;
  return enforceRateLimit(request, store, policy);
}

export function applySecurityHeaders(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)",
  );
  headers.set(
    "content-security-policy",
    "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://checkout.stripe.com",
  );
  if (new URL(request.url).protocol === "https:") {
    headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
