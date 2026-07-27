import { getCloudflareBinding } from "./cloudflare";
import { collaborationOverview } from "./collaboration";

export type BillingPlanId = "free" | "pro" | "studio";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  priceCny: number;
  memberLimit: number;
  monthlyAiLimit: number;
  features: string[];
};

export type BillingRecord = {
  ownerId: string;
  plan: BillingPlanId;
  status: "free" | "active" | "past_due" | "cancelled";
  customerId?: string | null;
  subscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  updatedAt: string;
};

type BillingStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export const billingPlans: BillingPlan[] = [
  {
    id: "free",
    name: "轻松备婚",
    priceCny: 0,
    memberLimit: 2,
    monthlyAiLimit: 30,
    features: ["基础计划与预算", "2 人协作", "每月 30 次 AI 任务"],
  },
  {
    id: "pro",
    name: "双喜专业版",
    priceCny: 69,
    memberLimit: 8,
    monthlyAiLimit: 200,
    features: ["完整业务模块", "8 人协作", "每月 200 次 AI 任务", "邮件提醒"],
  },
  {
    id: "studio",
    name: "婚策工作室",
    priceCny: 299,
    memberLimit: 30,
    monthlyAiLimit: 1000,
    features: ["30 人协作", "每月 1000 次 AI 任务", "操作审计", "优先任务队列"],
  },
];

function getStore() {
  return getCloudflareBinding<BillingStore>("WEDDING_DATA");
}

function billingKey(ownerId: string) {
  return `billing:${ownerId}`;
}

export function paymentConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRO_PRICE_ID?.trim() &&
      process.env.STRIPE_STUDIO_PRICE_ID?.trim(),
  );
}

function freeRecord(ownerId: string): BillingRecord {
  return {
    ownerId,
    plan: "free",
    status: "free",
    updatedAt: new Date().toISOString(),
  };
}

export async function readBillingRecord(store: BillingStore, ownerId: string) {
  const saved = await store.get(billingKey(ownerId));
  if (!saved) return freeRecord(ownerId);
  try {
    return JSON.parse(saved) as BillingRecord;
  } catch {
    return freeRecord(ownerId);
  }
}

export async function writeBillingRecord(
  store: BillingStore,
  record: BillingRecord,
) {
  await store.put(
    billingKey(record.ownerId),
    JSON.stringify({ ...record, updatedAt: new Date().toISOString() }),
  );
}

export async function billingOverview(request: Request) {
  const [collaboration, store] = await Promise.all([
    collaborationOverview(request),
    getStore(),
  ]);
  if (!collaboration || !store) return null;
  const record = await readBillingRecord(store, collaboration.ownerId);
  const plan =
    billingPlans.find((item) => item.id === record.plan) || billingPlans[0];
  return {
    ownerId: collaboration.ownerId,
    userEmail: collaboration.user.email,
    canManage: collaboration.role === "owner",
    record,
    plan,
    plans: billingPlans,
    paymentConfigured: paymentConfigured(),
  };
}

function stripePriceId(plan: BillingPlanId) {
  if (plan === "pro") return process.env.STRIPE_PRO_PRICE_ID?.trim() || "";
  if (plan === "studio") return process.env.STRIPE_STUDIO_PRICE_ID?.trim() || "";
  return "";
}

export async function createCheckoutSession(
  request: Request,
  planValue: unknown,
) {
  const overview = await billingOverview(request);
  if (!overview) throw new Error("请先登录。");
  if (!overview.canManage) throw new Error("只有空间拥有者可以管理套餐。");
  const plan = planValue === "studio" ? "studio" : "pro";
  const secret = process.env.STRIPE_SECRET_KEY?.trim() || "";
  const priceId = stripePriceId(plan);
  if (!secret || !priceId) throw new Error("支付通道尚未配置。");
  const origin = new URL(request.url).origin;
  const body = new URLSearchParams({
    mode: "subscription",
    customer_email: overview.record.customerId ? "" : overview.userEmail,
    client_reference_id: overview.ownerId,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "metadata[owner_id]": overview.ownerId,
    "metadata[plan]": plan,
    "subscription_data[metadata][owner_id]": overview.ownerId,
    "subscription_data[metadata][plan]": plan,
    success_url: `${origin}/?billing=success#collaboration`,
    cancel_url: `${origin}/?billing=cancelled#collaboration`,
  });
  if (overview.record.customerId) {
    body.delete("customer_email");
    body.set("customer", overview.record.customerId);
  }
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error?.message || "支付页面创建失败。");
  }
  return { checkoutUrl: payload.url, sessionId: payload.id, plan };
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyStripeWebhook(
  raw: string,
  signatureHeader: string,
) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  if (!secret) throw new Error("支付回调密钥尚未配置。");
  const parts = signatureHeader.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) || "";
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!/^\d+$/.test(timestamp) || signatures.length === 0) {
    throw new Error("支付回调签名格式无效。");
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new Error("支付回调已过期。");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${raw}`),
  );
  const expected = hex(digest);
  if (!signatures.some((signature) => secureEqual(signature, expected))) {
    throw new Error("支付回调签名验证失败。");
  }
}

type StripeObject = {
  id?: string;
  customer?: string;
  subscription?: string;
  status?: string;
  current_period_end?: number;
  client_reference_id?: string;
  metadata?: { owner_id?: string; plan?: string };
};

export async function applyStripeEvent(input: {
  type?: string;
  data?: { object?: StripeObject };
}) {
  const store = await getStore();
  if (!store) throw new Error("计费存储尚未连接。");
  const object = input.data?.object || {};
  const ownerId = object.metadata?.owner_id || object.client_reference_id || "";
  if (!ownerId) return { ignored: true };
  const current = await readBillingRecord(store, ownerId);
  const plan: BillingPlanId =
    object.metadata?.plan === "studio"
      ? "studio"
      : object.metadata?.plan === "pro"
        ? "pro"
        : current.plan;
  if (input.type === "checkout.session.completed") {
    await writeBillingRecord(store, {
      ...current,
      ownerId,
      plan,
      status: "active",
      customerId: object.customer || current.customerId,
      subscriptionId: object.subscription || current.subscriptionId,
    });
    return { updated: true };
  }
  if (
    input.type === "customer.subscription.created" ||
    input.type === "customer.subscription.updated"
  ) {
    const active = object.status === "active" || object.status === "trialing";
    await writeBillingRecord(store, {
      ...current,
      ownerId,
      plan,
      status: active
        ? "active"
        : object.status === "past_due"
          ? "past_due"
          : "cancelled",
      subscriptionId: object.id || current.subscriptionId,
      customerId: object.customer || current.customerId,
      currentPeriodEnd: object.current_period_end
        ? new Date(object.current_period_end * 1000).toISOString()
        : current.currentPeriodEnd,
    });
    return { updated: true };
  }
  if (input.type === "customer.subscription.deleted") {
    await writeBillingRecord(store, {
      ...freeRecord(ownerId),
      customerId: object.customer || current.customerId,
      subscriptionId: object.id || current.subscriptionId,
      status: "cancelled",
    });
    return { updated: true };
  }
  return { ignored: true };
}
