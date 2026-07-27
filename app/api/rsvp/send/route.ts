import { resolveDataScope } from "../../data-scope";
import { getDatabase, readGuestInvitation } from "../../database";
import {
  deliverExternalNotification,
  type NotificationChannel,
} from "../../notifications";

type SendItem = {
  code?: unknown;
  channel?: unknown;
  contact?: unknown;
};

const channelMap: Record<string, NotificationChannel | null> = {
  "链接": null,
  "邮件": "email",
  "短信": "sms",
  "微信": "wechat",
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function clean(value: unknown, maximum = 120) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export async function POST(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或连接云端工作区。" }, 401);
  if (!scope.canWrite) return json({ error: "当前角色没有发送邀请权限。" }, 403);
  const db = await getDatabase();
  if (!db) return json({ error: "宾客邀请数据库尚未连接。" }, 503);

  let input: { items?: unknown; reminder?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return json({ error: "发送资料格式无效。" }, 400);
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return json({ error: "请选择需要发送的宾客。" }, 400);
  }
  if (input.items.length > 100) {
    return json({ error: "单次最多发送 100 位宾客。" }, 400);
  }

  const reminder = input.reminder === true;
  const results = await Promise.all(
    (input.items as SendItem[]).map(async (item) => {
      const code = clean(item.code, 12).toUpperCase();
      const channelLabel = clean(item.channel, 10);
      const contact = clean(item.contact, 120);
      const channel = channelMap[channelLabel];
      if (!/^[A-F0-9]{12}$/.test(code) || channel === undefined) {
        return { code, status: "failed", error: "邀请编号或发送方式无效。" };
      }
      const invitation = await readGuestInvitation(db, code);
      if (!invitation || invitation.scopeId !== scope.id) {
        return { code, status: "failed", error: "邀请不存在或无权发送。" };
      }
      const invitationUrl = new URL(`/rsvp/${code}`, request.url).toString();
      if (channel === null) {
        return { code, status: "link_ready", invitationUrl };
      }
      if (channel === "email" && !/^\S+@\S+\.\S+$/.test(contact)) {
        return { code, status: "failed", error: "请填写有效邮箱。" };
      }
      if ((channel === "sms" || channel === "wechat") && contact.length < 4) {
        return { code, status: "failed", error: "请填写有效联系方式。" };
      }

      const title = reminder
        ? `${invitation.coupleNames} 的婚礼回执提醒`
        : `${invitation.coupleNames} 邀请你参加婚礼`;
      const message = reminder
        ? `${invitation.guestName}，婚礼将在 ${invitation.weddingDate} 于${invitation.city}举行，请抽空确认是否到场：${invitationUrl}`
        : `${invitation.guestName}，诚邀你于 ${invitation.weddingDate} 前往${invitation.city}见证婚礼。请通过专属链接提交回执：${invitationUrl}`;
      const delivery = await deliverExternalNotification({
        email: channel === "email" ? contact : "guest@invalid.local",
        phone: contact,
        title,
        message:
          channel === "wechat" ? `${contact}\n${message}` : message,
        channels: [channel],
      });
      return delivery.delivered.includes(channel)
        ? { code, status: "sent", invitationUrl }
        : {
            code,
            status: "failed",
            invitationUrl,
            error: `${channelLabel}发送通道尚未配置或发送失败。`,
          };
    }),
  );

  return json({
    reminder,
    sent: results.filter((item) => item.status === "sent").length,
    links: results.filter((item) => item.status === "link_ready").length,
    failed: results.filter((item) => item.status === "failed").length,
    results,
  });
}
