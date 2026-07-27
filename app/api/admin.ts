import {
  isAdminUser,
  listAuthUsers,
  requestUser,
  type AuthUserSummary,
} from "./auth";
import {
  billingPlans,
  readBillingRecord,
  writeBillingRecord,
  type BillingPlanId,
} from "./billing";
import { getCloudflareBinding } from "./cloudflare";
import {
  getVideoJobForScope,
  listActiveVideoJobReferences,
  type JobStore,
} from "./media/video-jobs";
import { processAutomatedReminders } from "./reminders";
import {
  grantAiUsageBonus,
  listAiUsageOwners,
  readAiUsageBonus,
  readAiUsageRecord,
  usageMonth,
  type UsageStore,
} from "./usage";
import {
  diagnoseExternalServices,
  readOperationalSummary,
} from "./operations";
import { ensureDatabaseSchema, getDatabase } from "./database";
import {
  migrateOwnerWorkspaces,
  readLastMigrationReport,
  runBackupRecoveryDrill,
} from "./data-migration";

type AdminStore = JobStore & UsageStore;

const WORKSPACE_OWNER_INDEX = "workspace:owners";

async function readStringArray(store: AdminStore, key: string) {
  const saved = await store.get(key);
  if (!saved) return [] as string[];
  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function adminContext(request: Request) {
  const [user, store] = await Promise.all([
    requestUser(request),
    getCloudflareBinding<AdminStore>("WEDDING_DATA"),
  ]);
  if (!user) throw new Error("请先登录管理员账号。");
  if (!isAdminUser(user)) throw new Error("当前账号没有后台管理权限。");
  if (!store) throw new Error("后台数据存储尚未连接。");
  return { user, store };
}

function userForOwner(users: AuthUserSummary[], ownerId: string) {
  return users.find((user) => user.id === ownerId) || null;
}

export async function adminOverview(request: Request) {
  const { user, store } = await adminContext(request);
  const month = usageMonth();
  const [users, workspaceOwners, usageOwners, activeReferences] =
    await Promise.all([
      listAuthUsers(store),
      readStringArray(store, WORKSPACE_OWNER_INDEX),
      listAiUsageOwners(store, month),
      listActiveVideoJobReferences(store),
    ]);
  const ownerIds = Array.from(
    new Set([...workspaceOwners, ...usageOwners, ...users.map((item) => item.id)]),
  );
  const ownerRows = await Promise.all(
    ownerIds.slice(0, 500).map(async (ownerId) => {
      const [billing, usage, bonus] = await Promise.all([
        readBillingRecord(store, ownerId),
        readAiUsageRecord(store, ownerId, month),
        readAiUsageBonus(store, ownerId, month),
      ]);
      const plan =
        billingPlans.find((item) => item.id === billing.plan) || billingPlans[0];
      return {
        ownerId,
        user: userForOwner(users, ownerId),
        plan: billing.plan,
        billingStatus: billing.status,
        allowance: plan.monthlyAiLimit + bonus,
        bonus,
        usedUnits: usage.usedUnits,
        reservedUnits: usage.reservedUnits,
        estimatedCostCny: usage.estimatedCostCny,
        operations: usage.operations,
        updatedAt: usage.updatedAt,
      };
    }),
  );
  const activeJobs = (
    await Promise.all(
      activeReferences.slice(0, 500).map(async (reference) => ({
        reference,
        job: await getVideoJobForScope(
          store,
          reference.scopeId,
          reference.id,
        ),
      })),
    )
  ).filter((item) => item.job);
  const planCounts = {
    free: ownerRows.filter((row) => row.plan === "free").length,
    pro: ownerRows.filter((row) => row.plan === "pro").length,
    studio: ownerRows.filter((row) => row.plan === "studio").length,
  };
  const alerts = [
    ...ownerRows
      .filter((row) => row.billingStatus === "past_due")
      .map((row) => ({
        kind: "payment",
        title: "订阅付款异常",
        detail: row.user?.email || row.ownerId,
      })),
    ...ownerRows
      .filter(
        (row) =>
          row.allowance > 0 &&
          (row.usedUnits + row.reservedUnits) / row.allowance >= 0.9,
      )
      .map((row) => ({
        kind: "quota",
        title: "AI 额度接近上限",
        detail: `${row.user?.email || row.ownerId} · ${row.usedUnits + row.reservedUnits}/${row.allowance}`,
      })),
    ...activeJobs
      .filter(
        ({ job }) =>
          job &&
          Date.now() - new Date(job.updatedAt).getTime() > 30 * 60 * 1000,
      )
      .map(({ job }) => ({
        kind: "job",
        title: "AI 视频任务处理过久",
        detail: job?.title || job?.id || "未知任务",
      })),
  ].slice(0, 30);
  const totalUsed = ownerRows.reduce((sum, row) => sum + row.usedUnits, 0);
  const totalReserved = ownerRows.reduce(
    (sum, row) => sum + row.reservedUnits,
    0,
  );
  const estimatedCostCny = Number(
    ownerRows
      .reduce((sum, row) => sum + row.estimatedCostCny, 0)
      .toFixed(2),
  );
  const operations = await readOperationalSummary(store);
  const [db, mediaBucket, videoQueue] = await Promise.all([
    getDatabase(),
    getCloudflareBinding<unknown>("MEDIA_BUCKET"),
    getCloudflareBinding<unknown>("VIDEO_TASK_QUEUE"),
  ]);
  let pendingDeletions = 0;
  if (db) {
    await ensureDatabaseSchema(db);
    const row = await db
      .prepare(
        "SELECT COUNT(*) AS total FROM account_deletions WHERE status = 'pending'",
      )
      .first<{ total: number }>();
    pendingDeletions = Number(row?.total || 0);
  } else {
    pendingDeletions = (
      await readStringArray(store, "account:deletions:index")
    ).length;
  }
  const readinessChecks = [
    { id: "database", label: "D1 事务数据库", ready: Boolean(db) },
    { id: "kv", label: "KV 缓存与限流", ready: true },
    { id: "media", label: "R2 素材存储", ready: Boolean(mediaBucket) },
    { id: "queue", label: "视频后台队列", ready: Boolean(videoQueue) },
    {
      id: "deepseek",
      label: "DeepSeek 服务端密钥",
      ready: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
    },
    {
      id: "ark",
      label: "豆包 / Seedance 服务端密钥",
      ready: Boolean(process.env.ARK_API_KEY?.trim()),
    },
    {
      id: "email",
      label: "验证邮件通道",
      ready: Boolean(process.env.RESEND_API_KEY?.trim()),
    },
    {
      id: "payment",
      label: "Stripe 支付配置",
      ready: Boolean(
        process.env.STRIPE_SECRET_KEY?.trim() &&
          process.env.STRIPE_WEBHOOK_SECRET?.trim(),
      ),
    },
    {
      id: "admin",
      label: "管理员账号配置",
      ready: Boolean(process.env.ADMIN_EMAILS?.trim()),
    },
    {
      id: "legal",
      label: "运营主体与联系信息",
      ready: Boolean(
        process.env.LEGAL_OPERATOR_NAME?.trim() &&
          process.env.LEGAL_CONTACT_EMAIL?.trim() &&
          process.env.LEGAL_ADDRESS?.trim(),
      ),
    },
  ];
  const lastMigrationReport = await readLastMigrationReport(store);
  return {
    admin: user,
    month,
    metrics: {
      users: users.length,
      verifiedUsers: users.filter((item) => item.emailVerified).length,
      workspaces: workspaceOwners.length,
      activeVideoJobs: activeJobs.length,
      totalUsed,
      totalReserved,
      estimatedCostCny,
    },
    planCounts,
    alerts,
    owners: ownerRows
      .sort((left, right) => right.usedUnits - left.usedUnits)
      .slice(0, 100),
    users: users
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 50),
    operations,
    readiness: {
      ready: readinessChecks.every((item) => item.ready),
      checks: readinessChecks,
      pendingDeletions,
      checkedAt: new Date().toISOString(),
      lastMigrationReport,
    },
  };
}

export async function runAdminAction(
  request: Request,
  input: {
    action?: unknown;
    ownerId?: unknown;
    units?: unknown;
    plan?: unknown;
  },
) {
  const { store } = await adminContext(request);
  if (input.action === "run_reminders") {
    return processAutomatedReminders({ WEDDING_DATA: store });
  }
  if (input.action === "diagnose_services") {
    return {
      services: await diagnoseExternalServices(request),
      operations: await readOperationalSummary(store),
    };
  }
  if (input.action === "migrate_workspaces") {
    const db = await getDatabase();
    if (!db) throw new Error("D1 事务数据库尚未连接。");
    return { migration: await migrateOwnerWorkspaces(store, db) };
  }
  if (input.action === "run_recovery_drill") {
    return { migration: await runBackupRecoveryDrill(store) };
  }
  const ownerId =
    typeof input.ownerId === "string" ? input.ownerId.trim().slice(0, 100) : "";
  if (!ownerId) throw new Error("请选择需要管理的婚礼空间。");
  if (input.action === "grant_quota") {
    const units = Number(input.units);
    if (!Number.isFinite(units) || units < 0) {
      throw new Error("赠送额度必须是大于或等于 0 的数字。");
    }
    return grantAiUsageBonus(store, ownerId, units);
  }
  if (input.action === "set_plan") {
    const plan: BillingPlanId =
      input.plan === "studio" ? "studio" : input.plan === "pro" ? "pro" : "free";
    const current = await readBillingRecord(store, ownerId);
    await writeBillingRecord(store, {
      ...current,
      ownerId,
      plan,
      status: plan === "free" ? "free" : "active",
    });
    return { ownerId, plan, updated: true };
  }
  throw new Error("不支持的后台操作。");
}
