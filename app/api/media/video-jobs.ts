import { getCloudflareBinding } from "../cloudflare";
import { resolveDataScope } from "../data-scope";

export type JobStore = {
  delete(key: string): Promise<void>;
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

export type StoredVideoJob = {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed" | "cancelled";
  progress: number;
  model: string;
  prompt: string;
  ratio: "16:9" | "9:16";
  seconds: number;
  title: string;
  style: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  backgroundMode?: "queue" | "browser";
  mediaPrefix?: string | null;
  lastPolledAt?: string | null;
  nextCheckAt?: string | null;
  storageKey?: string | null;
  sizeBytes?: number | null;
  error?: string | null;
  usageOwnerId?: string | null;
  usageReservationId?: string | null;
};

export type VideoJobReference = {
  id: string;
  scopeId: string;
};

const MAX_JOBS = 80;
const MAX_ACTIVE_JOBS = 500;
const ACTIVE_INDEX = "video-jobs:active";

export function getVideoJobStore() {
  return getCloudflareBinding<JobStore>("WEDDING_DATA");
}

async function jobContext(request: Request) {
  const [scope, store] = await Promise.all([
    resolveDataScope(request),
    getVideoJobStore(),
  ]);
  if (!scope || !store) return null;
  return { scope, store };
}

function jobKey(scopeId: string, id: string) {
  return `video-job:${scopeId}:${id}`;
}

function indexKey(scopeId: string) {
  return `video-jobs:${scopeId}`;
}

function idempotencyKey(scopeId: string, key: string) {
  return `video-idempotency:${scopeId}:${key}`;
}

async function readJsonArray<T>(store: JobStore, key: string) {
  const saved = await store.get(key);
  if (!saved) return [] as T[];
  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function readIndex(store: JobStore, scopeId: string) {
  const ids = await readJsonArray<unknown>(store, indexKey(scopeId));
  return ids
    .filter((id): id is string => typeof id === "string")
    .slice(0, MAX_JOBS);
}

function isActiveStatus(status: StoredVideoJob["status"]) {
  return status === "queued" || status === "in_progress";
}

async function updateActiveIndex(
  store: JobStore,
  scopeId: string,
  id: string,
  active: boolean,
) {
  const current = await readJsonArray<VideoJobReference>(store, ACTIVE_INDEX);
  const filtered = current.filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.scopeId === "string" &&
      !(item.id === id && item.scopeId === scopeId),
  );
  const next = active
    ? [{ scopeId, id }, ...filtered].slice(0, MAX_ACTIVE_JOBS)
    : filtered.slice(0, MAX_ACTIVE_JOBS);
  await store.put(ACTIVE_INDEX, JSON.stringify(next));
}

export async function listActiveVideoJobReferences(store: JobStore) {
  const current = await readJsonArray<VideoJobReference>(store, ACTIVE_INDEX);
  return current
    .filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.scopeId === "string",
    )
    .slice(0, MAX_ACTIVE_JOBS);
}

export function validateIdempotencyKey(value: string | null) {
  const key = value?.trim() || "";
  return /^[A-Za-z0-9_-]{16,100}$/.test(key) ? key : "";
}

export async function getVideoJobForScope(
  store: JobStore,
  scopeId: string,
  id: string,
) {
  const saved = await store.get(jobKey(scopeId, id));
  if (!saved) return null;
  try {
    return JSON.parse(saved) as StoredVideoJob;
  } catch {
    return null;
  }
}

export async function saveVideoJobForScope(
  store: JobStore,
  scopeId: string,
  job: StoredVideoJob,
  idempotency = "",
) {
  const ids = await readIndex(store, scopeId);
  const nextIds = [job.id, ...ids.filter((id) => id !== job.id)].slice(0, MAX_JOBS);
  await Promise.all([
    store.put(jobKey(scopeId, job.id), JSON.stringify(job)),
    store.put(indexKey(scopeId), JSON.stringify(nextIds)),
    idempotency
      ? store.put(idempotencyKey(scopeId, idempotency), job.id, {
          expirationTtl: 60 * 60 * 24,
        })
      : Promise.resolve(),
  ]);
  await updateActiveIndex(store, scopeId, job.id, isActiveStatus(job.status));
  return true;
}

export async function updateVideoJobForScope(
  store: JobStore,
  scopeId: string,
  id: string,
  patch: Partial<StoredVideoJob>,
) {
  const current = await getVideoJobForScope(store, scopeId, id);
  if (!current) return null;
  const next: StoredVideoJob = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  };
  await saveVideoJobForScope(store, scopeId, next);
  return next;
}

export async function findIdempotentVideoJob(request: Request, key: string) {
  if (!key) return null;
  const context = await jobContext(request);
  if (!context) return null;
  const id = await context.store.get(idempotencyKey(context.scope.id, key));
  if (!id) return null;
  return getVideoJobForScope(context.store, context.scope.id, id);
}

export async function saveVideoJob(
  request: Request,
  job: StoredVideoJob,
  idempotency = "",
) {
  const context = await jobContext(request);
  if (!context) return false;
  return saveVideoJobForScope(
    context.store,
    context.scope.id,
    job,
    idempotency,
  );
}

export async function getVideoJob(request: Request, id: string) {
  const context = await jobContext(request);
  if (!context) return null;
  return getVideoJobForScope(context.store, context.scope.id, id);
}

export async function updateVideoJob(
  request: Request,
  id: string,
  patch: Partial<StoredVideoJob>,
) {
  const context = await jobContext(request);
  if (!context) return null;
  return updateVideoJobForScope(
    context.store,
    context.scope.id,
    id,
    patch,
  );
}

export async function listVideoJobs(request: Request) {
  const context = await jobContext(request);
  if (!context) return [] as StoredVideoJob[];
  const ids = await readIndex(context.store, context.scope.id);
  const jobs = await Promise.all(
    ids.map((id) => getVideoJobForScope(context.store, context.scope.id, id)),
  );
  return jobs
    .filter((job): job is StoredVideoJob => Boolean(job))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
