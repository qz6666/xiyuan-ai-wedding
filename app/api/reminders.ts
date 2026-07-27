import {
  listAuthUsers,
  requestUser,
  type AuthUser,
} from "./auth";
import { getCloudflareBinding } from "./cloudflare";
import { resolveDataScope } from "./data-scope";
import {
  dispatchUserNotification,
  type NotificationDeliveryConfig,
  type NotificationStore,
} from "./notifications";

type ReminderStore = NotificationStore & {
  delete(key: string): Promise<void>;
};

type ReminderTask = {
  id?: number | string;
  title?: string;
  status?: string;
  dueDate?: string;
};

type ReminderBudget = {
  total?: number;
  paid?: number;
};

type ReminderWorkspace = {
  profile?: {
    weddingDate?: string;
    budgetCap?: number;
  };
  taskList?: ReminderTask[];
  budgetList?: ReminderBudget[];
};

type WorkspaceEnvelope = {
  workspace?: ReminderWorkspace;
};

export type ReminderRule = {
  id: string;
  title: string;
  message: string;
  kind: "info" | "success" | "warning";
};

export type ReminderEnv = NotificationDeliveryConfig & {
  WEDDING_DATA?: ReminderStore;
};

const WORKSPACE_OWNER_INDEX = "workspace:owners";
const REMINDER_TTL_SECONDS = 60 * 60 * 24 * 3;

function chinaDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysBetween(from: string, to: string) {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return null;
  return Math.round((toTime - fromTime) / 86_400_000);
}

async function readJson<T>(store: ReminderStore, key: string) {
  const saved = await store.get(key);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return null;
  }
}

async function workspaceOwnerIds(store: ReminderStore) {
  const saved = await readJson<unknown>(store, WORKSPACE_OWNER_INDEX);
  return Array.isArray(saved)
    ? saved.filter((item): item is string => typeof item === "string")
    : [];
}

export function buildWorkspaceReminderRules(
  workspace: ReminderWorkspace,
  now = new Date(),
) {
  const today = chinaDate(now);
  const rules: ReminderRule[] = [];
  const weddingDate = workspace.profile?.weddingDate || "";
  const weddingDays = daysBetween(today, weddingDate);
  const weddingMilestones = new Set([30, 14, 7, 3, 1, 0]);
  if (weddingDays !== null && weddingMilestones.has(weddingDays)) {
    rules.push({
      id: `wedding-${weddingDays}`,
      title: weddingDays === 0 ? "今天就是婚礼日" : `距离婚礼还有 ${weddingDays} 天`,
      message:
        weddingDays <= 3
          ? "请确认人员到场、物品装车、时间表和应急联系人。"
          : "建议检查当前阶段任务、供应商确认和预算付款节点。",
      kind: weddingDays <= 3 ? "warning" : "info",
    });
  }

  const pendingTasks = (workspace.taskList || []).filter(
    (task) => task.status !== "已完成" && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || ""),
  );
  const overdue = pendingTasks.filter(
    (task) => (daysBetween(task.dueDate || "", today) || 0) > 0,
  );
  if (overdue.length > 0) {
    rules.push({
      id: "tasks-overdue",
      title: `${overdue.length} 项备婚任务已逾期`,
      message: overdue
        .slice(0, 3)
        .map((task) => task.title || "未命名任务")
        .join("、"),
      kind: "warning",
    });
  }
  const dueSoon = pendingTasks.filter((task) => {
    const days = daysBetween(today, task.dueDate || "");
    return days !== null && days >= 0 && days <= 3;
  });
  if (dueSoon.length > 0) {
    rules.push({
      id: "tasks-due-soon",
      title: `${dueSoon.length} 项任务将在 3 天内到期`,
      message: dueSoon
        .slice(0, 3)
        .map((task) => task.title || "未命名任务")
        .join("、"),
      kind: "info",
    });
  }

  const budgetCap = Math.max(0, Number(workspace.profile?.budgetCap) || 0);
  const budgetTotal = (workspace.budgetList || []).reduce(
    (sum, item) => sum + Math.max(0, Number(item.total) || 0),
    0,
  );
  if (budgetCap > 0 && budgetTotal > budgetCap) {
    rules.push({
      id: "budget-over",
      title: "婚礼预算已经超过上限",
      message: `当前预算 ¥${budgetTotal.toLocaleString("zh-CN")}，超过上限 ¥${(
        budgetTotal - budgetCap
      ).toLocaleString("zh-CN")}。`,
      kind: "warning",
    });
  }
  return rules;
}

async function reminderRecipients(
  store: ReminderStore,
  ownerId: string,
  users: AuthUser[],
) {
  const owner = users.find((user) => user.id === ownerId);
  const members =
    (await readJson<
      Array<{
        userId: string;
        email: string;
        displayName: string;
      }>
    >(store, `collab:members:${ownerId}`)) || [];
  return [
    ...(owner ? [owner] : []),
    ...members.map(
      (member): AuthUser => ({
        id: member.userId,
        email: member.email,
        displayName: member.displayName,
        emailVerified: true,
      }),
    ),
  ].filter(
    (user, index, all) => all.findIndex((item) => item.id === user.id) === index,
  );
}

export async function processOwnerReminders(
  store: ReminderStore,
  ownerId: string,
  users: AuthUser[],
  config?: NotificationDeliveryConfig,
  now = new Date(),
  force = false,
) {
  const envelope = await readJson<WorkspaceEnvelope>(
    store,
    `workspace:user:${ownerId}`,
  );
  const rules = buildWorkspaceReminderRules(envelope?.workspace || {}, now);
  const recipients = await reminderRecipients(store, ownerId, users);
  const today = chinaDate(now);
  let sent = 0;
  for (const rule of rules) {
    for (const recipient of recipients) {
      const key = `reminder:sent:${ownerId}:${recipient.id}:${rule.id}:${today}`;
      if (!force && (await store.get(key))) continue;
      await dispatchUserNotification(store, recipient, rule, config);
      await store.put(key, "1", { expirationTtl: REMINDER_TTL_SECONDS });
      sent += 1;
    }
  }
  return { ownerId, rules, recipients: recipients.length, sent };
}

export async function processAutomatedReminders(
  env: ReminderEnv,
  now = new Date(),
) {
  const store = env.WEDDING_DATA;
  if (!store) return { scanned: 0, sent: 0 };
  const [owners, users] = await Promise.all([
    workspaceOwnerIds(store),
    listAuthUsers(store),
  ]);
  let sent = 0;
  for (const ownerId of owners) {
    const result = await processOwnerReminders(
      store,
      ownerId,
      users,
      env,
      now,
    );
    sent += result.sent;
  }
  return { scanned: owners.length, sent };
}

export async function reminderOverview(request: Request) {
  const [scope, user, store] = await Promise.all([
    resolveDataScope(request),
    requestUser(request),
    getCloudflareBinding<ReminderStore>("WEDDING_DATA"),
  ]);
  if (!scope?.ownerId || !user || !store) return null;
  const envelope = await readJson<WorkspaceEnvelope>(
    store,
    `workspace:user:${scope.ownerId}`,
  );
  return {
    ownerId: scope.ownerId,
    rules: buildWorkspaceReminderRules(envelope?.workspace || {}),
    canRun: scope.canWrite,
  };
}

export async function runRequestReminders(request: Request) {
  const [overview, store, users] = await Promise.all([
    reminderOverview(request),
    getCloudflareBinding<ReminderStore>("WEDDING_DATA"),
    listAuthUsers(),
  ]);
  if (!overview || !store) throw new Error("请先登录后检查提醒。");
  if (!overview.canRun) throw new Error("当前角色只有查看权限。");
  return processOwnerReminders(
    store,
    overview.ownerId,
    users,
    undefined,
    new Date(),
    true,
  );
}
