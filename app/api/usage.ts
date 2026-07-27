import { AiProviderError } from "./ai-providers";
import {
  billingPlans,
  readBillingRecord,
  type BillingPlanId,
} from "./billing";
import { getCloudflareBinding } from "./cloudflare";
import { resolveDataScope } from "./data-scope";

export type AiOperation = "copy" | "image" | "portrait" | "video";

export type AiUsageEvent = {
  id: string;
  operation: AiOperation;
  units: number;
  estimatedCostCny: number;
  status: "reserved" | "completed" | "refunded";
  createdAt: string;
  settledAt?: string | null;
  referenceId?: string | null;
};

export type AiUsageRecord = {
  ownerId: string;
  month: string;
  usedUnits: number;
  reservedUnits: number;
  refundedUnits: number;
  estimatedCostCny: number;
  operations: Record<AiOperation, number>;
  events: AiUsageEvent[];
  updatedAt: string;
};

export type AiUsageReservation = {
  id: string;
  ownerId: string;
  month: string;
  operation: AiOperation;
  units: number;
  estimatedCostCny: number;
  status: "reserved" | "completed" | "refunded";
  createdAt: string;
  settledAt?: string | null;
  referenceId?: string | null;
};

export type UsageStore = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

const MAX_USAGE_EVENTS = 60;
const USAGE_RETENTION_SECONDS = 60 * 60 * 24 * 400;

export const aiOperationPolicies = {
  copy: { label: "AI 文案", units: 1, estimatedCostCny: 0.02 },
  image: { label: "场景效果图", units: 4, estimatedCostCny: 0.35 },
  portrait: { label: "AI 证件照", units: 5, estimatedCostCny: 0.55 },
  video: { label: "AI 视频", units: 20, estimatedCostCny: 2.8 },
} satisfies Record<
  AiOperation,
  { label: string; units: number; estimatedCostCny: number }
>;

export function usageMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function usageKey(ownerId: string, month: string) {
  return `ai:usage:${ownerId}:${month}`;
}

function reservationKey(ownerId: string, reservationId: string) {
  return `ai:reservation:${ownerId}:${reservationId}`;
}

function bonusKey(ownerId: string, month: string) {
  return `ai:bonus:${ownerId}:${month}`;
}

function usageOwnersKey(month: string) {
  return `ai:usage:owners:${month}`;
}

function emptyRecord(ownerId: string, month: string): AiUsageRecord {
  return {
    ownerId,
    month,
    usedUnits: 0,
    reservedUnits: 0,
    refundedUnits: 0,
    estimatedCostCny: 0,
    operations: {
      copy: 0,
      image: 0,
      portrait: 0,
      video: 0,
    },
    events: [],
    updatedAt: new Date().toISOString(),
  };
}

async function readJson<T>(store: UsageStore, key: string) {
  const saved = await store.get(key);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return null;
  }
}

async function readStringArray(store: UsageStore, key: string) {
  const value = await readJson<unknown>(store, key);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function readAiUsageRecord(
  store: UsageStore,
  ownerId: string,
  month = usageMonth(),
) {
  return (
    (await readJson<AiUsageRecord>(store, usageKey(ownerId, month))) ||
    emptyRecord(ownerId, month)
  );
}

export async function readAiUsageBonus(
  store: UsageStore,
  ownerId: string,
  month = usageMonth(),
) {
  const value = Number(await store.get(bonusKey(ownerId, month)));
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

async function writeAiUsageRecord(store: UsageStore, record: AiUsageRecord) {
  await store.put(
    usageKey(record.ownerId, record.month),
    JSON.stringify({ ...record, updatedAt: new Date().toISOString() }),
    { expirationTtl: USAGE_RETENTION_SECONDS },
  );
}

async function registerUsageOwner(
  store: UsageStore,
  ownerId: string,
  month: string,
) {
  const key = usageOwnersKey(month);
  const owners = await readStringArray(store, key);
  if (owners.includes(ownerId)) return;
  await store.put(
    key,
    JSON.stringify([ownerId, ...owners].slice(0, 5000)),
    { expirationTtl: USAGE_RETENTION_SECONDS },
  );
}

function operationPrice(operation: AiOperation, seconds?: number) {
  if (operation !== "video") return aiOperationPolicies[operation];
  const duration = seconds === 4 || seconds === 12 ? seconds : 8;
  return {
    ...aiOperationPolicies.video,
    units: duration === 4 ? 12 : duration === 12 ? 28 : 20,
    estimatedCostCny: Number((duration * 0.35).toFixed(2)),
  };
}

async function allowanceForOwner(store: UsageStore, ownerId: string, month: string) {
  const billing = await readBillingRecord(store, ownerId);
  const plan =
    billingPlans.find((item) => item.id === billing.plan) || billingPlans[0];
  const bonus = await readAiUsageBonus(store, ownerId, month);
  return {
    billing,
    plan,
    bonus,
    allowance: plan.monthlyAiLimit + bonus,
  };
}

export async function reserveAiUsage(
  request: Request,
  operation: AiOperation,
  options?: { seconds?: number },
) {
  const [scope, store] = await Promise.all([
    resolveDataScope(request),
    getCloudflareBinding<UsageStore>("WEDDING_DATA"),
  ]);
  if (!scope?.authenticated || !scope.ownerId || !store) {
    throw new AiProviderError(
      "使用平台 AI 服务前请先登录账号。",
      401,
      "ai_login_required",
    );
  }
  if (!scope.canWrite) {
    throw new AiProviderError(
      "当前角色只有查看权限。",
      403,
      "workspace_read_only",
    );
  }
  const month = usageMonth();
  const [record, allowance] = await Promise.all([
    readAiUsageRecord(store, scope.ownerId, month),
    allowanceForOwner(store, scope.ownerId, month),
  ]);
  const price = operationPrice(operation, options?.seconds);
  if (
    record.usedUnits + record.reservedUnits + price.units >
    allowance.allowance
  ) {
    throw new AiProviderError(
      `本月 AI 额度不足，当前剩余 ${Math.max(
        0,
        allowance.allowance - record.usedUnits - record.reservedUnits,
      )} 点，本次需要 ${price.units} 点。`,
      402,
      "ai_quota_exceeded",
    );
  }
  const reservation: AiUsageReservation = {
    id: crypto.randomUUID(),
    ownerId: scope.ownerId,
    month,
    operation,
    units: price.units,
    estimatedCostCny: price.estimatedCostCny,
    status: "reserved",
    createdAt: new Date().toISOString(),
    settledAt: null,
    referenceId: null,
  };
  record.reservedUnits += reservation.units;
  record.events = [reservation, ...record.events].slice(0, MAX_USAGE_EVENTS);
  await Promise.all([
    writeAiUsageRecord(store, record),
    store.put(
      reservationKey(scope.ownerId, reservation.id),
      JSON.stringify(reservation),
      { expirationTtl: USAGE_RETENTION_SECONDS },
    ),
    registerUsageOwner(store, scope.ownerId, month),
  ]);
  return reservation;
}

export async function settleAiUsage(
  store: UsageStore,
  ownerId: string,
  reservationId: string,
  succeeded: boolean,
  referenceId?: string | null,
) {
  if (!reservationId) return null;
  const key = reservationKey(ownerId, reservationId);
  const reservation = await readJson<AiUsageReservation>(store, key);
  if (!reservation || reservation.status !== "reserved") return reservation;
  const record = await readAiUsageRecord(store, ownerId, reservation.month);
  const status = succeeded ? "completed" : "refunded";
  const settledAt = new Date().toISOString();
  reservation.status = status;
  reservation.settledAt = settledAt;
  reservation.referenceId = referenceId || reservation.referenceId || null;
  record.reservedUnits = Math.max(0, record.reservedUnits - reservation.units);
  if (succeeded) {
    record.usedUnits += reservation.units;
    record.estimatedCostCny = Number(
      (record.estimatedCostCny + reservation.estimatedCostCny).toFixed(2),
    );
    record.operations[reservation.operation] += 1;
  } else {
    record.refundedUnits += reservation.units;
  }
  record.events = [
    reservation,
    ...record.events.filter((item) => item.id !== reservation.id),
  ].slice(0, MAX_USAGE_EVENTS);
  await Promise.all([
    writeAiUsageRecord(store, record),
    store.put(key, JSON.stringify(reservation), {
      expirationTtl: USAGE_RETENTION_SECONDS,
    }),
  ]);
  return reservation;
}

export async function settleRequestAiUsage(
  request: Request,
  reservation: AiUsageReservation | null,
  succeeded: boolean,
  referenceId?: string | null,
) {
  if (!reservation) return null;
  const store = await getCloudflareBinding<UsageStore>("WEDDING_DATA");
  if (!store) return null;
  return settleAiUsage(
    store,
    reservation.ownerId,
    reservation.id,
    succeeded,
    referenceId,
  );
}

export async function aiUsageOverview(request: Request) {
  const [scope, store] = await Promise.all([
    resolveDataScope(request),
    getCloudflareBinding<UsageStore>("WEDDING_DATA"),
  ]);
  if (!scope?.authenticated || !scope.ownerId || !store) return null;
  const month = usageMonth();
  const [record, allowance] = await Promise.all([
    readAiUsageRecord(store, scope.ownerId, month),
    allowanceForOwner(store, scope.ownerId, month),
  ]);
  return {
    ownerId: scope.ownerId,
    month,
    record,
    plan: {
      id: allowance.plan.id as BillingPlanId,
      name: allowance.plan.name,
      baseAllowance: allowance.plan.monthlyAiLimit,
    },
    bonus: allowance.bonus,
    allowance: allowance.allowance,
    available: Math.max(
      0,
      allowance.allowance - record.usedUnits - record.reservedUnits,
    ),
    policies: aiOperationPolicies,
  };
}

export async function grantAiUsageBonus(
  store: UsageStore,
  ownerId: string,
  units: number,
  month = usageMonth(),
) {
  const normalized = Math.max(0, Math.min(100_000, Math.round(units)));
  await store.put(bonusKey(ownerId, month), String(normalized), {
    expirationTtl: USAGE_RETENTION_SECONDS,
  });
  return { ownerId, month, bonus: normalized };
}

export async function listAiUsageOwners(
  store: UsageStore,
  month = usageMonth(),
) {
  return readStringArray(store, usageOwnersKey(month));
}
