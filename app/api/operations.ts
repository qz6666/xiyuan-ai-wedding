import {
  aiConfig,
  arkRequest,
  deepSeekRequest,
  requestProviderKey,
} from "./ai-providers";
import { getCloudflareBinding } from "./cloudflare";
import { isAdminUser, requestUser } from "./auth";

export type OperationsStore = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

export type OperationalIncident = {
  id: string;
  createdAt: string;
  source: string;
  severity: "warning" | "error" | "critical";
  code: string;
  message: string;
  path?: string;
  status?: number;
  state: "open" | "resolved";
  resolvedAt?: string;
  resolvedBy?: string;
  occurrences?: number;
};

type DailyMetrics = {
  date: string;
  requests: number;
  errors: number;
  rateLimited: number;
  queueRetries: number;
  reminderFailures: number;
  updatedAt: string;
};

const INCIDENT_INDEX = "ops:incidents";
const MAX_INCIDENTS = 100;

function metricKey(date = new Date()) {
  return `ops:metrics:${date.toISOString().slice(0, 10)}`;
}

function emptyMetrics(date = new Date()): DailyMetrics {
  return {
    date: date.toISOString().slice(0, 10),
    requests: 0,
    errors: 0,
    rateLimited: 0,
    queueRetries: 0,
    reminderFailures: 0,
    updatedAt: new Date().toISOString(),
  };
}

async function parseJson<T>(store: OperationsStore, key: string, fallback: T) {
  const saved = await store.get(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export async function recordOperationalMetric(
  store: OperationsStore | undefined,
  field: keyof Omit<DailyMetrics, "date" | "updatedAt">,
  amount = 1,
) {
  if (!store) return;
  try {
    const key = metricKey();
    const metrics = await parseJson(store, key, emptyMetrics());
    metrics[field] = Math.max(0, Number(metrics[field] || 0) + amount);
    metrics.updatedAt = new Date().toISOString();
    await store.put(key, JSON.stringify(metrics), {
      expirationTtl: 60 * 60 * 24 * 90,
    });
  } catch {
    // Monitoring must never interrupt a customer request.
  }
}

export async function recordOperationalIncident(
  store: OperationsStore | undefined,
  input: Omit<
    OperationalIncident,
    "id" | "createdAt" | "state" | "resolvedAt" | "resolvedBy" | "occurrences"
  >,
) {
  if (!store) return;
  try {
    const incident: OperationalIncident = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source: input.source.slice(0, 80),
      severity: input.severity,
      code: input.code.slice(0, 100),
      message: input.message.slice(0, 500),
      path: input.path?.slice(0, 240),
      status: input.status,
      state: "open",
      occurrences: 1,
    };
    const incidents = await parseJson<OperationalIncident[]>(
      store,
      INCIDENT_INDEX,
      [],
    );
    const duplicate = incidents.find(
      (item) =>
        item.state !== "resolved" &&
        item.source === incident.source &&
        item.code === incident.code &&
        item.path === incident.path &&
        Date.now() - new Date(item.createdAt).getTime() < 5 * 60 * 1000,
    );
    if (duplicate) {
      duplicate.createdAt = incident.createdAt;
      duplicate.message = incident.message;
      duplicate.status = incident.status;
      duplicate.occurrences = Math.max(1, duplicate.occurrences || 1) + 1;
      await store.put(INCIDENT_INDEX, JSON.stringify(incidents));
      return;
    }
    await store.put(
      INCIDENT_INDEX,
      JSON.stringify([incident, ...incidents].slice(0, MAX_INCIDENTS)),
    );
    if (incident.severity === "critical") {
      await sendCriticalAlert(incident);
    }
  } catch {
    // Monitoring must never interrupt a customer request.
  }
}

async function sendCriticalAlert(incident: OperationalIncident) {
  const webhook = process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() || "";
  if (!webhook) return;
  const token = process.env.OPERATIONS_ALERT_WEBHOOK_TOKEN?.trim() || "";
  try {
    await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        application: "喜缘 AI 婚礼流程系统",
        level: incident.severity,
        source: incident.source,
        code: incident.code,
        message: incident.message,
        path: incident.path || null,
        status: incident.status || null,
        occurredAt: incident.createdAt,
      }),
    });
  } catch {
    // Alert transport failures must not create recursive incidents.
  }
}

export async function readOperationalSummary(store: OperationsStore) {
  const [metrics, incidents] = await Promise.all([
    parseJson(store, metricKey(), emptyMetrics()),
    parseJson<OperationalIncident[]>(store, INCIDENT_INDEX, []),
  ]);
  return {
    status: incidents.some(
      (item) =>
        item.state !== "resolved" &&
        item.severity === "critical" &&
        Date.now() - new Date(item.createdAt).getTime() < 60 * 60 * 1000,
    )
      ? "degraded"
      : "healthy",
    metrics,
    incidents: incidents
      .map((item) => ({ ...item, state: item.state || "open" }))
      .slice(0, 30),
    checkedAt: new Date().toISOString(),
  };
}

async function serviceCheck(
  name: string,
  configured: boolean,
  check: () => Promise<Response>,
) {
  if (!configured) {
    return {
      name,
      configured: false,
      reachable: null,
      latencyMs: null,
      status: null,
      message: "尚未配置服务端密钥",
    };
  }
  const startedAt = Date.now();
  try {
    const response = await check();
    return {
      name,
      configured: true,
      reachable: response.ok,
      latencyMs: Date.now() - startedAt,
      status: response.status,
      message: response.ok ? "连接正常" : `服务返回 ${response.status}`,
    };
  } catch (error) {
    return {
      name,
      configured: true,
      reachable: false,
      latencyMs: Date.now() - startedAt,
      status: null,
      message: error instanceof Error ? error.message.slice(0, 240) : "连接失败",
    };
  }
}

export async function diagnoseExternalServices(request: Request) {
  const config = aiConfig();
  const deepSeekBrowserKey = requestProviderKey(request, "deepseek");
  const arkBrowserKey = requestProviderKey(request, "ark");
  const resendKey = process.env.RESEND_API_KEY?.trim() || "";
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim() || "";
  return Promise.all([
    serviceCheck(
      "DeepSeek 文案",
      Boolean(deepSeekBrowserKey || config.deepSeekApiKey),
      () => deepSeekRequest("/models", { method: "GET" }, deepSeekBrowserKey),
    ),
    serviceCheck(
      "豆包图片 / Seedance 视频",
      Boolean(arkBrowserKey || config.arkApiKey),
      () => arkRequest("/models", { method: "GET" }, arkBrowserKey),
    ),
    serviceCheck("Resend 邮件", Boolean(resendKey), () =>
      fetch("https://api.resend.com/domains", {
        headers: { authorization: `Bearer ${resendKey}` },
      }),
    ),
    serviceCheck("Stripe 支付", Boolean(stripeKey), () =>
      fetch("https://api.stripe.com/v1/account", {
        headers: { authorization: `Bearer ${stripeKey}` },
      }),
    ),
  ]);
}

export async function operationsOverview(request: Request) {
  const [user, store] = await Promise.all([
    requestUser(request),
    getCloudflareBinding<OperationsStore>("WEDDING_DATA"),
  ]);
  if (!user) throw new Error("请先登录管理员账号。");
  if (!isAdminUser(user)) throw new Error("当前账号没有后台管理权限。");
  if (!store) throw new Error("运行监控存储尚未连接。");
  return readOperationalSummary(store);
}

export async function operationsAction(
  request: Request,
  input: { action?: unknown; incidentId?: unknown },
) {
  const [user, store] = await Promise.all([
    requestUser(request),
    getCloudflareBinding<OperationsStore>("WEDDING_DATA"),
  ]);
  if (!user) throw new Error("请先登录管理员账号。");
  if (!isAdminUser(user)) throw new Error("当前账号没有后台管理权限。");
  if (!store) throw new Error("运行监控存储尚未连接。");
  if (input.action === "diagnose_services") {
    const services = await diagnoseExternalServices(request);
    for (const service of services) {
      if (service.configured && service.reachable === false) {
        await recordOperationalIncident(store, {
          source: "provider-diagnostics",
          severity: "warning",
          code: "provider_unreachable",
          message: `${service.name}：${service.message}`,
        });
      }
    }
    return {
      services,
      operations: await readOperationalSummary(store),
    };
  }

  if (
    input.action === "resolve_incident" ||
    input.action === "reopen_incident"
  ) {
    const incidentId =
      typeof input.incidentId === "string" ? input.incidentId.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(incidentId)) {
      throw new Error("异常事件编号无效。");
    }
    const incidents = await parseJson<OperationalIncident[]>(
      store,
      INCIDENT_INDEX,
      [],
    );
    const incident = incidents.find((item) => item.id === incidentId);
    if (!incident) throw new Error("异常事件不存在或已超过保留期。");
    const resolved = input.action === "resolve_incident";
    incident.state = resolved ? "resolved" : "open";
    incident.resolvedAt = resolved ? new Date().toISOString() : undefined;
    incident.resolvedBy = resolved ? user.email : undefined;
    await store.put(INCIDENT_INDEX, JSON.stringify(incidents));
    return {
      updated: true,
      incident,
      operations: await readOperationalSummary(store),
    };
  }

  throw new Error("不支持的监控操作。");
}
