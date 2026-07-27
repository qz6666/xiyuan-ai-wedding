import { withWorkspaceIntegrity, type WorkspaceEnvelope } from "../backups";
import { getCloudflareBinding } from "../cloudflare";
import { resolveDataScope } from "../data-scope";
import {
  compareAndSwapWorkspaceRecord,
  deleteGuestInvitation,
  getDatabase,
  listGuestInvitationsForScope,
  readGuestInvitation,
  readGuestInvitationForGuest,
  readWorkspaceRecord,
  saveGuestInvitation,
  updateGuestInvitationResponse,
  type GuestInvitationRecord,
} from "../database";
import {
  addInAppNotification,
  type NotificationStore,
} from "../notifications";

type WorkspaceStore = NotificationStore;

type GuestInput = {
  id?: unknown;
  name?: unknown;
  relation?: unknown;
  count?: unknown;
};

type ProfileInput = {
  brideName?: unknown;
  groomName?: unknown;
  weddingDate?: unknown;
  city?: unknown;
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function cleanText(value: unknown, fallback = "", maximum = 160) {
  return typeof value === "string"
    ? value.trim().slice(0, maximum)
    : fallback;
}

function normalizeCode(value: unknown) {
  return cleanText(value).toUpperCase();
}

function createInvitationCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
}

function publicInvitation(record: GuestInvitationRecord) {
  return {
    code: record.code,
    guestName: record.guestName,
    relation: record.relation,
    invitedCount: record.invitedCount,
    coupleNames: record.coupleNames,
    weddingDate: record.weddingDate,
    city: record.city,
    rsvp: record.rsvp,
    attendingCount: record.attendingCount,
    companion: Boolean(record.companion),
    dietary: record.dietary,
    message: record.message,
    respondedAt: record.respondedAt,
  };
}

async function syncResponseToWorkspace(
  invitation: GuestInvitationRecord,
  input: {
    rsvp: "会到场" | "不参加";
    attendingCount: number;
    companion: boolean;
    dietary: string;
    respondedAt: string;
  },
) {
  const db = await getDatabase();
  if (!db) return;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readWorkspaceRecord(db, invitation.scopeId);
    if (!current) return;
    let envelope: WorkspaceEnvelope;
    try {
      envelope = JSON.parse(current.envelope) as WorkspaceEnvelope;
    } catch {
      return;
    }
    const workspace = envelope.workspace as {
      guestList?: Array<Record<string, unknown> & { id?: unknown }>;
    };
    if (!Array.isArray(workspace?.guestList)) return;

    const nextGuests = workspace.guestList.map((guest) =>
      Number(guest.id) === invitation.guestId
        ? {
            ...guest,
            rsvp: input.rsvp,
            count: input.attendingCount,
            companion: input.companion,
            dietary: input.dietary,
            respondedAt: input.respondedAt,
          }
        : guest,
    );
    const nextEnvelope = await withWorkspaceIntegrity({
      workspace: { ...workspace, guestList: nextGuests },
      usage: envelope.usage ?? null,
      updatedAt: input.respondedAt,
      revision: current.revision + 1,
    });
    const serialized = JSON.stringify(nextEnvelope);
    const written = await compareAndSwapWorkspaceRecord(
      db,
      {
        scopeId: invitation.scopeId,
        ownerId: invitation.ownerId,
        envelope: serialized,
        checksum: nextEnvelope.checksum || "",
        version: nextEnvelope.version || 2,
        revision: nextEnvelope.revision || current.revision + 1,
        updatedAt: nextEnvelope.updatedAt,
      },
      current.revision,
    );
    if (!written) continue;
    const store = await getCloudflareBinding<WorkspaceStore>("WEDDING_DATA");
    await store?.put(invitation.workspaceKey, serialized);
    return;
  }
}

export async function GET(request: Request) {
  const code = normalizeCode(new URL(request.url).searchParams.get("code"));
  if (!code) {
    const scope = await resolveDataScope(request);
    if (!scope) return json({ error: "请先登录或连接云端工作区。" }, 401);
    const db = await getDatabase();
    if (!db) return json({ error: "宾客回执服务尚未连接。" }, 503);
    const invitations = await listGuestInvitationsForScope(db, scope.id);
    return json({
      invitations: invitations.map((invitation) => ({
        guestId: invitation.guestId,
        ...publicInvitation(invitation),
      })),
    });
  }
  if (!/^[A-F0-9]{12}$/.test(code)) {
    return json({ error: "邀请地址无效或不完整。" }, 400);
  }
  const db = await getDatabase();
  if (!db) return json({ error: "宾客回执服务尚未连接。" }, 503);
  const invitation = await readGuestInvitation(db, code);
  if (!invitation) return json({ error: "邀请不存在或已失效。" }, 404);
  return json({ invitation: publicInvitation(invitation) });
}

export async function POST(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或连接云端工作区。" }, 401);
  if (!scope.canWrite) return json({ error: "当前角色没有邀请权限。" }, 403);
  const db = await getDatabase();
  if (!db) return json({ error: "宾客回执数据库尚未连接。" }, 503);

  let input: { guest?: GuestInput; profile?: ProfileInput };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return json({ error: "邀请资料格式无效。" }, 400);
  }
  const guestId = Math.round(Number(input.guest?.id));
  const guestName = cleanText(input.guest?.name, "", 60);
  if (!Number.isSafeInteger(guestId) || guestId <= 0 || !guestName) {
    return json({ error: "请先填写有效的宾客姓名。" }, 400);
  }

  const existing = await readGuestInvitationForGuest(db, scope.id, guestId);
  const code = existing?.code || createInvitationCode();
  const createdAt = existing?.createdAt || new Date().toISOString();
  const invitation: GuestInvitationRecord = {
    code,
    scopeId: scope.id,
    workspaceKey: scope.workspaceKey,
    ownerId: scope.ownerId,
    guestId,
    guestName,
    relation: cleanText(input.guest?.relation, "亲友", 40),
    invitedCount: Math.min(
      20,
      Math.max(1, Math.round(Number(input.guest?.count) || 1)),
    ),
    coupleNames: `${cleanText(input.profile?.brideName, "新娘", 30)} & ${cleanText(
      input.profile?.groomName,
      "新郎",
      30,
    )}`,
    weddingDate: cleanText(input.profile?.weddingDate, "待确认", 20),
    city: cleanText(input.profile?.city, "待确认", 40),
    rsvp: existing?.rsvp || "待确认",
    attendingCount: existing?.attendingCount || 1,
    companion: existing?.companion || 0,
    dietary: existing?.dietary || "",
    message: existing?.message || "",
    createdAt,
    respondedAt: existing?.respondedAt || null,
  };
  await saveGuestInvitation(db, invitation);
  const invitationUrl = new URL(`/rsvp/${code}`, request.url).toString();
  return json(
    {
      invitation: publicInvitation(invitation),
      invitationUrl,
      reused: Boolean(existing),
    },
    existing ? 200 : 201,
  );
}

export async function PATCH(request: Request) {
  let input: {
    code?: unknown;
    rsvp?: unknown;
    attendingCount?: unknown;
    companion?: unknown;
    dietary?: unknown;
    message?: unknown;
  };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return json({ error: "回执内容格式无效。" }, 400);
  }
  const code = normalizeCode(input.code);
  const rsvp =
    input.rsvp === "会到场" || input.rsvp === "不参加" ? input.rsvp : null;
  if (!/^[A-F0-9]{12}$/.test(code) || !rsvp) {
    return json({ error: "请选择是否参加婚礼。" }, 400);
  }

  const db = await getDatabase();
  if (!db) return json({ error: "宾客回执服务尚未连接。" }, 503);
  const invitation = await readGuestInvitation(db, code);
  if (!invitation) return json({ error: "邀请不存在或已失效。" }, 404);

  const attendingCount =
    rsvp === "不参加"
      ? 0
      : Math.min(
          Math.max(1, invitation.invitedCount + 1),
          Math.max(1, Math.round(Number(input.attendingCount) || 1)),
        );
  const respondedAt = new Date().toISOString();
  const response = {
    code,
    rsvp,
    attendingCount,
    companion: rsvp === "会到场" && Boolean(input.companion),
    dietary: cleanText(input.dietary, "", 160),
    message: cleanText(input.message, "", 300),
    respondedAt,
  };
  await updateGuestInvitationResponse(db, response);
  await syncResponseToWorkspace(invitation, response);

  const store = await getCloudflareBinding<WorkspaceStore>("WEDDING_DATA");
  if (store && invitation.ownerId) {
    await addInAppNotification(store, invitation.ownerId, {
      title: `${invitation.guestName} 已提交婚礼回执`,
      message:
        rsvp === "会到场"
          ? `确认 ${attendingCount} 人到场${response.dietary ? `，饮食需求：${response.dietary}` : ""}。`
          : "回复本次无法参加。",
      kind: rsvp === "会到场" ? "success" : "info",
    });
  }
  return json({
    saved: true,
    invitation: publicInvitation({
      ...invitation,
      ...response,
      companion: response.companion ? 1 : 0,
    }),
  });
}

export async function DELETE(request: Request) {
  const scope = await resolveDataScope(request);
  if (!scope) return json({ error: "请先登录或连接云端工作区。" }, 401);
  if (!scope.canWrite) return json({ error: "当前角色没有撤回邀请权限。" }, 403);
  const code = normalizeCode(new URL(request.url).searchParams.get("code"));
  if (!/^[A-F0-9]{12}$/.test(code)) {
    return json({ error: "邀请编号无效。" }, 400);
  }
  const db = await getDatabase();
  if (!db) return json({ error: "宾客回执数据库尚未连接。" }, 503);
  const invitation = await readGuestInvitation(db, code);
  if (!invitation) return json({ deleted: true });
  if (invitation.scopeId !== scope.id) {
    return json({ error: "无权撤回这份宾客邀请。" }, 403);
  }
  await deleteGuestInvitation(db, code);
  return json({ deleted: true });
}
