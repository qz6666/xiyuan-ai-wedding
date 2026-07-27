import { getCloudflareBinding } from "./cloudflare";
import { requestUser, sha256, type AuthUser } from "./auth";

export type CollaborationRole = "owner" | "planner" | "editor" | "viewer";

export type CollaborationMember = {
  userId: string;
  email: string;
  displayName: string;
  role: CollaborationRole;
  joinedAt: string;
};

export type CollaborationInvite = {
  id: string;
  codeHash: string;
  email: string;
  role: Exclude<CollaborationRole, "owner">;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "cancelled";
};

export type AuditEntry = {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type CollaborationStore = {
  delete(key: string): Promise<void>;
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

type ActiveWorkspace = {
  ownerId: string;
  role: CollaborationRole;
};

const MAX_AUDIT_ENTRIES = 120;
const MAX_INVITES = 40;
const INVITE_SECONDS = 60 * 60 * 24 * 7;

export function getCollaborationStore() {
  return getCloudflareBinding<CollaborationStore>("WEDDING_DATA");
}

function activeKey(userId: string) {
  return `collab:active:${userId}`;
}

function membersKey(ownerId: string) {
  return `collab:members:${ownerId}`;
}

function ownerKey(ownerId: string) {
  return `collab:owner:${ownerId}`;
}

function invitesKey(ownerId: string) {
  return `collab:invites:${ownerId}`;
}

function inviteKey(codeHash: string) {
  return `collab:invite:${codeHash}`;
}

function auditKey(ownerId: string) {
  return `collab:audit:${ownerId}`;
}

async function readArray<T>(store: CollaborationStore, key: string) {
  const saved = await store.get(key);
  if (!saved) return [] as T[];
  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function readObject<T>(store: CollaborationStore, key: string) {
  const saved = await store.get(key);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return null;
  }
}

export async function resolveCollaborationScope(
  store: CollaborationStore,
  user: AuthUser,
) {
  const active = await readObject<ActiveWorkspace>(store, activeKey(user.id));
  if (!active || active.ownerId === user.id) {
    return {
      ownerId: user.id,
      role: "owner" as CollaborationRole,
    };
  }
  const members = await readArray<CollaborationMember>(
    store,
    membersKey(active.ownerId),
  );
  const membership = members.find((member) => member.userId === user.id);
  if (!membership) {
    await store.delete(activeKey(user.id));
    return {
      ownerId: user.id,
      role: "owner" as CollaborationRole,
    };
  }
  return {
    ownerId: active.ownerId,
    role: membership.role,
  };
}

export function canWriteCollaborationRole(role: CollaborationRole) {
  return role === "owner" || role === "planner" || role === "editor";
}

export async function appendAuditEntry(
  store: CollaborationStore,
  ownerId: string,
  actor: AuthUser,
  action: string,
  detail: string,
) {
  const entries = await readArray<AuditEntry>(store, auditKey(ownerId));
  const latest = entries[0];
  if (
    latest &&
    latest.actorId === actor.id &&
    latest.action === action.slice(0, 60) &&
    latest.detail === detail.slice(0, 240) &&
    Date.now() - new Date(latest.createdAt).getTime() < 5 * 60 * 1000
  ) {
    return;
  }
  const next: AuditEntry[] = [
    {
      id: crypto.randomUUID(),
      actorId: actor.id,
      actorName: actor.displayName,
      action: action.slice(0, 60),
      detail: detail.slice(0, 240),
      createdAt: new Date().toISOString(),
    },
    ...entries,
  ].slice(0, MAX_AUDIT_ENTRIES);
  await store.put(auditKey(ownerId), JSON.stringify(next));
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function normalizedRole(value: unknown): Exclude<CollaborationRole, "owner"> {
  return value === "planner" || value === "viewer" ? value : "editor";
}

function normalizedEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    throw new Error("请输入有效的成员邮箱。");
  }
  return email;
}

export async function collaborationOverview(request: Request) {
  const [user, store] = await Promise.all([
    requestUser(request),
    getCollaborationStore(),
  ]);
  if (!user || !store) return null;
  const scope = await resolveCollaborationScope(store, user);
  const members = await readArray<CollaborationMember>(
    store,
    membersKey(scope.ownerId),
  );
  let ownerMember = await readObject<CollaborationMember>(
    store,
    ownerKey(scope.ownerId),
  );
  if (scope.ownerId === user.id) {
    ownerMember = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: "owner",
      joinedAt: ownerMember?.joinedAt || new Date().toISOString(),
    };
    await store.put(ownerKey(scope.ownerId), JSON.stringify(ownerMember));
  }
  const visibleMembers = ownerMember
    ? [ownerMember, ...members.filter((member) => member.userId !== ownerMember.userId)]
    : members;
  const inviteIds = await readArray<string>(store, invitesKey(scope.ownerId));
  const invites = (
    await Promise.all(
      inviteIds.slice(0, MAX_INVITES).map((id) =>
        readObject<CollaborationInvite>(store, inviteKey(id)),
      ),
    )
  ).filter(
    (invite): invite is CollaborationInvite =>
      Boolean(
        invite &&
          invite.status === "pending" &&
          new Date(invite.expiresAt).getTime() > Date.now(),
      ),
  );
  const audit = await readArray<AuditEntry>(store, auditKey(scope.ownerId));
  return {
    user,
    store,
    ownerId: scope.ownerId,
    role: scope.role,
    canManage: scope.role === "owner",
    canWrite: canWriteCollaborationRole(scope.role),
    members: visibleMembers,
    invites,
    audit: audit.slice(0, 20),
  };
}

export async function collaborationAuditExport(request: Request) {
  const overview = await collaborationOverview(request);
  if (!overview) throw new Error("请先登录。");
  if (!overview.canManage) {
    throw new Error("只有空间拥有者可以导出完整审计记录。");
  }
  const entries = await readArray<AuditEntry>(
    overview.store,
    auditKey(overview.ownerId),
  );
  await appendAuditEntry(
    overview.store,
    overview.ownerId,
    overview.user,
    "导出审计记录",
    `导出了 ${entries.length} 条空间操作记录`,
  );
  return {
    ownerId: overview.ownerId,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

export async function createCollaborationInvite(
  request: Request,
  input: { email?: unknown; role?: unknown },
) {
  const overview = await collaborationOverview(request);
  if (!overview) throw new Error("请先登录。");
  if (!overview.canManage) throw new Error("只有空间拥有者可以邀请成员。");
  const email = normalizedEmail(input.email);
  if (email === overview.user.email) throw new Error("无需邀请当前账号。");
  if (overview.members.some((member) => member.email === email)) {
    throw new Error("该成员已经加入当前空间。");
  }
  const code = inviteCode();
  const codeHash = await sha256(code);
  const now = new Date();
  const invite: CollaborationInvite = {
    id: codeHash,
    codeHash,
    email,
    role: normalizedRole(input.role),
    ownerId: overview.ownerId,
    ownerName: overview.user.displayName,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + INVITE_SECONDS * 1000).toISOString(),
    status: "pending",
  };
  const inviteIds = await readArray<string>(
    overview.store,
    invitesKey(overview.ownerId),
  );
  await Promise.all([
    overview.store.put(inviteKey(codeHash), JSON.stringify(invite), {
      expirationTtl: INVITE_SECONDS,
    }),
    overview.store.put(
      invitesKey(overview.ownerId),
      JSON.stringify([codeHash, ...inviteIds.filter((id) => id !== codeHash)].slice(0, MAX_INVITES)),
    ),
    appendAuditEntry(
      overview.store,
      overview.ownerId,
      overview.user,
      "邀请成员",
      `邀请 ${email}，角色为 ${invite.role}`,
    ),
  ]);
  return { invite, code };
}

export async function acceptCollaborationInvite(
  request: Request,
  codeValue: unknown,
) {
  const [user, store] = await Promise.all([
    requestUser(request),
    getCollaborationStore(),
  ]);
  if (!user || !store) throw new Error("请先登录后接受邀请。");
  const code = typeof codeValue === "string" ? codeValue.trim().toUpperCase() : "";
  if (!/^[A-Z2-9]{10}$/.test(code)) throw new Error("邀请码格式无效。");
  const codeHash = await sha256(code);
  const invite = await readObject<CollaborationInvite>(store, inviteKey(codeHash));
  if (
    !invite ||
    invite.status !== "pending" ||
    new Date(invite.expiresAt).getTime() <= Date.now()
  ) {
    throw new Error("邀请已失效，请让空间拥有者重新邀请。");
  }
  if (invite.email !== user.email) throw new Error("该邀请不属于当前登录邮箱。");
  const members = await readArray<CollaborationMember>(
    store,
    membersKey(invite.ownerId),
  );
  const member: CollaborationMember = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: invite.role,
    joinedAt: new Date().toISOString(),
  };
  invite.status = "accepted";
  await Promise.all([
    store.put(
      membersKey(invite.ownerId),
      JSON.stringify([member, ...members.filter((item) => item.userId !== user.id)]),
    ),
    store.put(
      activeKey(user.id),
      JSON.stringify({ ownerId: invite.ownerId, role: invite.role }),
    ),
    store.put(inviteKey(codeHash), JSON.stringify(invite), {
      expirationTtl: 60 * 60 * 24,
    }),
    appendAuditEntry(
      store,
      invite.ownerId,
      user,
      "加入空间",
      `${user.displayName} 接受邀请并成为 ${invite.role}`,
    ),
  ]);
  return { ownerId: invite.ownerId, role: invite.role };
}

export async function updateCollaborationMember(
  request: Request,
  input: { userId?: unknown; role?: unknown },
) {
  const overview = await collaborationOverview(request);
  if (!overview || !overview.canManage) {
    throw new Error("只有空间拥有者可以调整成员角色。");
  }
  const userId = typeof input.userId === "string" ? input.userId : "";
  const role = normalizedRole(input.role);
  const members = overview.members
    .filter((member) => member.role !== "owner")
    .map((member) => (member.userId === userId ? { ...member, role } : member));
  if (!members.some((member) => member.userId === userId)) {
    throw new Error("未找到该协作成员。");
  }
  await Promise.all([
    overview.store.put(membersKey(overview.ownerId), JSON.stringify(members)),
    overview.store.put(activeKey(userId), JSON.stringify({ ownerId: overview.ownerId, role })),
    appendAuditEntry(
      overview.store,
      overview.ownerId,
      overview.user,
      "调整权限",
      `成员角色已调整为 ${role}`,
    ),
  ]);
  return { updated: true };
}

export async function removeCollaborationMember(
  request: Request,
  userId: string,
) {
  const overview = await collaborationOverview(request);
  if (!overview || !overview.canManage) {
    throw new Error("只有空间拥有者可以移除成员。");
  }
  const member = overview.members.find((item) => item.userId === userId);
  if (!member || member.role === "owner") throw new Error("无法移除该成员。");
  const members = overview.members.filter(
    (item) => item.userId !== userId && item.role !== "owner",
  );
  await Promise.all([
    overview.store.put(membersKey(overview.ownerId), JSON.stringify(members)),
    overview.store.delete(activeKey(userId)),
    appendAuditEntry(
      overview.store,
      overview.ownerId,
      overview.user,
      "移除成员",
      `已移除 ${member.displayName}`,
    ),
  ]);
  return { removed: true };
}
