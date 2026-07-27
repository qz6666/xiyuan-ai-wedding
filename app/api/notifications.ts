import { getCloudflareBinding } from "./cloudflare";
import { requestUser, type AuthUser } from "./auth";

export type NotificationChannel = "email" | "sms" | "wechat";

export type NotificationPreferences = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  wechat: boolean;
  phone: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  kind: "info" | "success" | "warning";
  read: boolean;
  createdAt: string;
};

export type NotificationStore = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

export type NotificationDeliveryConfig = {
  RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
  SMS_WEBHOOK_URL?: string;
  SMS_WEBHOOK_TOKEN?: string;
  WECHAT_WEBHOOK_URL?: string;
  WECHAT_WEBHOOK_TOKEN?: string;
};

const MAX_NOTIFICATIONS = 80;

function getStore() {
  return getCloudflareBinding<NotificationStore>("WEDDING_DATA");
}

function notificationKey(userId: string) {
  return `notifications:${userId}`;
}

function preferencesKey(userId: string) {
  return `notification-preferences:${userId}`;
}

function defaultPreferences(): NotificationPreferences {
  return {
    inApp: true,
    email: true,
    sms: false,
    wechat: false,
    phone: "",
  };
}

async function readJson<T>(store: NotificationStore, key: string, fallback: T) {
  const saved = await store.get(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export function notificationCapabilities() {
  return {
    email: Boolean(process.env.RESEND_API_KEY?.trim()),
    sms: Boolean(process.env.SMS_WEBHOOK_URL?.trim()),
    wechat: Boolean(process.env.WECHAT_WEBHOOK_URL?.trim()),
  };
}

export async function addInAppNotification(
  store: NotificationStore,
  userId: string,
  input: Pick<NotificationItem, "title" | "message" | "kind">,
) {
  const current = await readJson<NotificationItem[]>(
    store,
    notificationKey(userId),
    [],
  );
  const item: NotificationItem = {
    id: crypto.randomUUID(),
    title: input.title.slice(0, 80),
    message: input.message.slice(0, 300),
    kind: input.kind,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await store.put(
    notificationKey(userId),
    JSON.stringify([item, ...current].slice(0, MAX_NOTIFICATIONS)),
  );
  return item;
}

async function sendEmail(
  email: string,
  title: string,
  message: string,
  config?: NotificationDeliveryConfig,
) {
  const apiKey =
    config?.RESEND_API_KEY?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    "";
  if (!apiKey) return false;
  const from =
    config?.AUTH_EMAIL_FROM?.trim() ||
    process.env.AUTH_EMAIL_FROM?.trim() ||
    "喜缘 <no-reply@xiyuan.app>";
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: title,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#3b0d14"><h2>${escapeHtml(title)}</h2><p style="line-height:1.8;color:#7a5350">${escapeHtml(message)}</p></div>`,
    }),
  });
  return response.ok;
}

async function sendWebhook(
  url: string,
  token: string,
  payload: Record<string, unknown>,
) {
  if (!url) return false;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  return response.ok;
}

export async function deliverExternalNotification(input: {
  email: string;
  phone?: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  config?: NotificationDeliveryConfig;
}) {
  const delivered: NotificationChannel[] = [];
  const unavailable: NotificationChannel[] = [];
  for (const channel of input.channels) {
    let success = false;
    try {
      if (channel === "email") {
        success = await sendEmail(
          input.email,
          input.title,
          input.message,
          input.config,
        );
      }
      if (channel === "sms") {
        success = await sendWebhook(
          input.config?.SMS_WEBHOOK_URL?.trim() ||
            process.env.SMS_WEBHOOK_URL?.trim() ||
            "",
          input.config?.SMS_WEBHOOK_TOKEN?.trim() ||
            process.env.SMS_WEBHOOK_TOKEN?.trim() ||
            "",
          {
            to: input.phone || "",
            title: input.title,
            message: input.message,
          },
        );
      }
      if (channel === "wechat") {
        success = await sendWebhook(
          input.config?.WECHAT_WEBHOOK_URL?.trim() ||
            process.env.WECHAT_WEBHOOK_URL?.trim() ||
            "",
          input.config?.WECHAT_WEBHOOK_TOKEN?.trim() ||
            process.env.WECHAT_WEBHOOK_TOKEN?.trim() ||
            "",
          {
            msgtype: "text",
            text: { content: `${input.title}\n${input.message}` },
          },
        );
      }
    } catch {
      success = false;
    }
    if (success) delivered.push(channel);
    else unavailable.push(channel);
  }
  return { delivered, unavailable };
}

export async function notificationOverview(request: Request) {
  const [user, store] = await Promise.all([requestUser(request), getStore()]);
  if (!user || !store) return null;
  const [items, preferences] = await Promise.all([
    readJson<NotificationItem[]>(store, notificationKey(user.id), []),
    readJson<NotificationPreferences>(
      store,
      preferencesKey(user.id),
      defaultPreferences(),
    ),
  ]);
  return {
    user,
    store,
    items,
    preferences: { ...defaultPreferences(), ...preferences },
    capabilities: notificationCapabilities(),
  };
}

export async function updateNotificationPreferences(
  request: Request,
  input: Partial<NotificationPreferences>,
) {
  const overview = await notificationOverview(request);
  if (!overview) throw new Error("请先登录。");
  const preferences: NotificationPreferences = {
    inApp: input.inApp !== false,
    email: input.email !== false,
    sms: input.sms === true,
    wechat: input.wechat === true,
    phone:
      typeof input.phone === "string"
        ? input.phone.replace(/[^\d+ -]/g, "").trim().slice(0, 30)
        : "",
  };
  await overview.store.put(
    preferencesKey(overview.user.id),
    JSON.stringify(preferences),
  );
  return preferences;
}

export async function markNotificationsRead(request: Request) {
  const overview = await notificationOverview(request);
  if (!overview) throw new Error("请先登录。");
  const items = overview.items.map((item) => ({ ...item, read: true }));
  await overview.store.put(notificationKey(overview.user.id), JSON.stringify(items));
  return { updated: items.length };
}

export async function sendTestNotification(request: Request) {
  const overview = await notificationOverview(request);
  if (!overview) throw new Error("请先登录。");
  const title = "喜缘提醒测试";
  const message = "通知通道已完成测试，后续可用于婚期节点、预算和供应商提醒。";
  const item = await addInAppNotification(overview.store, overview.user.id, {
    title,
    message,
    kind: "success",
  });
  const channels: NotificationChannel[] = [];
  if (overview.preferences.email) channels.push("email");
  if (overview.preferences.sms) channels.push("sms");
  if (overview.preferences.wechat) channels.push("wechat");
  const delivery = await deliverExternalNotification({
    email: overview.user.email,
    phone: overview.preferences.phone,
    title,
    message,
    channels,
  });
  return { item, ...delivery };
}

export async function notifyUser(
  user: AuthUser,
  input: Pick<NotificationItem, "title" | "message" | "kind">,
) {
  const store = await getStore();
  if (!store) return null;
  return addInAppNotification(store, user.id, input);
}

export async function dispatchUserNotification(
  store: NotificationStore,
  user: AuthUser,
  input: Pick<NotificationItem, "title" | "message" | "kind">,
  config?: NotificationDeliveryConfig,
) {
  const preferences = {
    ...defaultPreferences(),
    ...(await readJson<NotificationPreferences>(
      store,
      preferencesKey(user.id),
      defaultPreferences(),
    )),
  };
  const item = preferences.inApp
    ? await addInAppNotification(store, user.id, input)
    : null;
  const channels: NotificationChannel[] = [];
  if (preferences.email) channels.push("email");
  if (preferences.sms) channels.push("sms");
  if (preferences.wechat) channels.push("wechat");
  const delivery = await deliverExternalNotification({
    email: user.email,
    phone: preferences.phone,
    title: input.title,
    message: input.message,
    channels,
    config,
  });
  return { item, ...delivery };
}
