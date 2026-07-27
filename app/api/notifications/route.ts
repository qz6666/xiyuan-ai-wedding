import {
  markNotificationsRead,
  notificationOverview,
  sendTestNotification,
  updateNotificationPreferences,
} from "../notifications";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function failed(error: unknown) {
  const message = error instanceof Error ? error.message : "通知服务处理失败。";
  return json({ error: message }, message.includes("登录") ? 401 : 400);
}

export async function GET(request: Request) {
  const overview = await notificationOverview(request);
  if (!overview) return json({ error: "请先登录。" }, 401);
  return json({
    items: overview.items,
    preferences: overview.preferences,
    capabilities: overview.capabilities,
    unread: overview.items.filter((item) => !item.read).length,
  });
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      action?: unknown;
      preferences?: Record<string, unknown>;
    };
    if (input.action === "read") return json(await markNotificationsRead(request));
    if (input.action === "test") return json(await sendTestNotification(request));
    return json(
      await updateNotificationPreferences(
        request,
        (input.preferences || {}) as Parameters<typeof updateNotificationPreferences>[1],
      ),
    );
  } catch (error) {
    return failed(error);
  }
}
