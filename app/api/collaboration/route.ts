import {
  acceptCollaborationInvite,
  collaborationOverview,
  createCollaborationInvite,
  removeCollaborationMember,
  updateCollaborationMember,
} from "../collaboration";
import { deliverExternalNotification } from "../notifications";
import { billingOverview } from "../billing";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "协作服务处理失败。";
  const status = message.includes("登录")
    ? 401
    : message.includes("只有") || message.includes("不属于")
      ? 403
      : 400;
  return json({ error: message }, status);
}

export async function GET(request: Request) {
  const overview = await collaborationOverview(request);
  if (!overview) return json({ error: "请先登录。" }, 401);
  return json({
    ownerId: overview.ownerId,
    role: overview.role,
    canManage: overview.canManage,
    canWrite: overview.canWrite,
    members: overview.members,
    invites: overview.invites,
    audit: overview.audit,
  });
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      action?: unknown;
      email?: unknown;
      role?: unknown;
      code?: unknown;
    };
    if (input.action === "accept") {
      return json(await acceptCollaborationInvite(request, input.code));
    }
    const [billing, team] = await Promise.all([
      billingOverview(request),
      collaborationOverview(request),
    ]);
    if (
      billing &&
      team &&
      team.members.length + team.invites.length >= billing.plan.memberLimit
    ) {
      throw new Error(`当前套餐最多支持 ${billing.plan.memberLimit} 位成员。`);
    }
    const result = await createCollaborationInvite(request, input);
    const origin = new URL(request.url).origin;
    const local = ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
    const delivery = local
      ? { delivered: [], unavailable: ["email"] }
      : await deliverExternalNotification({
          email: result.invite.email,
          title: `${result.invite.ownerName} 邀请你加入喜缘备婚空间`,
          message: `登录喜缘后输入邀请码 ${result.code} 接受邀请。入口：${origin}/#collaboration`,
          channels: ["email"],
        });
    return json({ ...result, delivery }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const input = (await request.json()) as {
      userId?: unknown;
      role?: unknown;
    };
    return json(await updateCollaborationMember(request, input));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") || "";
    return json(await removeCollaborationMember(request, userId));
  } catch (error) {
    return errorResponse(error);
  }
}
