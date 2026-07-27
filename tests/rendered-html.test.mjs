import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function request(path = "/", init = {}, bindings = {}) {
  globalThis.__XIYUAN_CLOUDFLARE_BINDINGS__ = bindings;
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      ...init,
      headers: {
        accept: "text/html",
        ...(init.headers || {}),
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      ...bindings,
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function createMemoryStore(initial = []) {
  const values = new Map(initial);
  return {
    values,
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
  };
}

async function registerVerifiedAccount(bindings, email, displayName) {
  const registration = await request(
    "/api/auth/register",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: "verified-test-password-2026",
        displayName,
        acceptedTerms: true,
      }),
    },
    bindings,
  );
  assert.equal(registration.status, 201);
  const registered = await registration.json();
  const verification = await request(
    "/api/auth/verify/confirm",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, code: registered.devCode }),
    },
    bindings,
  );
  assert.equal(verification.status, 200);
  return verification.headers.get("set-cookie").split(";")[0];
}

test("server-renders the Xiyuan wedding landing page", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>喜缘 · AI 备婚搭子<\/title>/i);
  assert.match(html, /你的 AI 备婚搭子/);
  assert.match(html, /让备婚/);
  assert.match(html, /像恋爱一样轻松/);
  assert.match(html, /准备好开始你们的备婚旅程了吗/);
  assert.match(html, /AI 服务已就绪/);
  assert.match(html, /喜缘小助手/);
  assert.match(html, /常用入口/);
  assert.match(html, /告诉喜缘小助手你的备婚需求/);
  assert.match(html, /每天一张备婚清单/);
  assert.match(html, /AI 视觉与 3D 工作台/);
  assert.match(html, /场景效果图/);
  assert.match(html, /AI 证件照/);
  assert.match(html, /3D 婚礼现场预览/);
  assert.match(html, /API 接入/);
  assert.match(html, /登录/);
  assert.match(html, /DeepSeek/);
  assert.match(html, /豆包图片/);
  assert.match(html, /Seedance/);
  assert.match(html, /AI 任务中心/);
  assert.match(html, /云端备婚资料/);
  assert.match(html, /完整素材库/);
  assert.match(html, /生成邀请/);
  assert.match(html, /批量发送/);
  assert.match(html, /批量催办/);
  assert.match(html, /智能排桌/);
  assert.match(html, /婚礼当天指挥中心/);
  assert.match(html, /合同与付款/);
  assert.match(html, /回收站与撤销/);
  assert.match(html, /本次预估/);
  assert.match(html, /本月/);
  assert.match(html, /真实任务/);
  assert.match(html, /红金中式主舞台灵感/);
  assert.match(html, /我们要结婚了 · 30 秒预告/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("saves and restores a cloud workspace by sync code", async () => {
  const values = new Map();
  const store = {
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
  };
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "x-workspace-id": "xy-test-cloud-workspace-20260723",
  };
  const saved = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        workspace: { profile: { brideName: "云端新娘" } },
        usage: { limit: 30 },
      }),
    },
    { WEDDING_DATA: store },
  );
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).saved, true);

  const restored = await request(
    "/api/workspace",
    { headers },
    { WEDDING_DATA: store },
  );
  assert.equal(restored.status, 200);
  const payload = await restored.json();
  assert.equal(payload.storage, "cloud-kv");
  assert.equal(payload.data.workspace.profile.brideName, "云端新娘");
});

test("prevents stale workspace saves and supports an explicit local overwrite", async () => {
  const store = createMemoryStore();
  const bindings = { WEDDING_DATA: store };
  const baseHeaders = {
    accept: "application/json",
    "content-type": "application/json",
    "x-workspace-id": "xy-concurrency-test-20260725",
  };

  const first = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers: { ...baseHeaders, "if-match": "0" },
      body: JSON.stringify({ workspace: { prompt: "第一版" } }),
    },
    bindings,
  );
  assert.equal(first.status, 200);
  assert.equal((await first.json()).revision, 1);

  const second = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers: { ...baseHeaders, "if-match": "1" },
      body: JSON.stringify({ workspace: { prompt: "第二版" } }),
    },
    bindings,
  );
  assert.equal(second.status, 200);
  assert.equal((await second.json()).revision, 2);

  const stale = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers: { ...baseHeaders, "if-match": "1" },
      body: JSON.stringify({ workspace: { prompt: "过期页面" } }),
    },
    bindings,
  );
  assert.equal(stale.status, 409);
  const stalePayload = await stale.json();
  assert.equal(stalePayload.code, "workspace_conflict");
  assert.equal(stalePayload.currentRevision, 2);

  const preserved = await request(
    "/api/workspace",
    { headers: baseHeaders },
    bindings,
  );
  assert.equal((await preserved.json()).data.workspace.prompt, "第二版");

  const forced = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers: {
        ...baseHeaders,
        "if-match": "1",
        "x-force-overwrite": "1",
      },
      body: JSON.stringify({ workspace: { prompt: "确认保留本机" } }),
    },
    bindings,
  );
  assert.equal(forced.status, 200);
  assert.equal((await forced.json()).revision, 3);
});

test("isolates workspace and media data between signed-in users", async () => {
  const values = new Map();
  const store = {
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
  };
  const objects = new Map();
  const bucket = {
    async put(key, value, options) {
      objects.set(key, {
        bytes: value,
        contentType: options?.httpMetadata?.contentType,
      });
    },
    async get(key) {
      const object = objects.get(key);
      if (!object) return null;
      return {
        size: object.bytes.byteLength,
        httpMetadata: { contentType: object.contentType },
        async arrayBuffer() {
          return object.bytes;
        },
      };
    },
    async delete(key) {
      objects.delete(key);
    },
  };
  const bindings = { WEDDING_DATA: store, MEDIA_BUCKET: bucket };
  const register = async (email, displayName) => {
    const response = await request(
      "/api/auth/register",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: "wedding-test-2026",
          displayName,
          acceptedTerms: true,
        }),
      },
      bindings,
    );
    assert.equal(response.status, 201);
    const registration = await response.json();
    assert.equal(registration.verificationRequired, true);
    assert.match(registration.devCode, /^\d{6}$/);
    const verified = await request(
      "/api/auth/verify/confirm",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: registration.devCode,
        }),
      },
      bindings,
    );
    assert.equal(verified.status, 200);
    return verified.headers.get("set-cookie").split(";")[0];
  };

  const firstCookie = await register("first@example.com", "第一对新人");
  const secondCookie = await register("second@example.com", "第二对新人");
  const sharedSyncCode = "xy-shared-code-20260723";
  const firstMe = await request(
    "/api/auth/me",
    { headers: { accept: "application/json", cookie: firstCookie } },
    bindings,
  );
  const firstUser = (await firstMe.json()).user;

  const saved = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie: firstCookie,
        "x-workspace-id": sharedSyncCode,
      },
      body: JSON.stringify({
        workspace: { profile: { brideName: "账号一资料" } },
      }),
    },
    bindings,
  );
  assert.equal(saved.status, 200);

  const secondWorkspace = await request(
    "/api/workspace",
    {
      headers: {
        accept: "application/json",
        cookie: secondCookie,
        "x-workspace-id": sharedSyncCode,
      },
    },
    bindings,
  );
  assert.equal(secondWorkspace.status, 200);
  assert.equal((await secondWorkspace.json()).data, null);

  const firstWorkspace = await request(
    "/api/workspace",
    {
      headers: {
        accept: "application/json",
        cookie: firstCookie,
        "x-workspace-id": sharedSyncCode,
      },
    },
    bindings,
  );
  assert.equal((await firstWorkspace.json()).data.workspace.profile.brideName, "账号一资料");

  const upload = await request(
    "/api/library",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "image/webp",
        cookie: firstCookie,
        "x-workspace-id": sharedSyncCode,
      },
      body: new Uint8Array([82, 73, 70, 70, 9, 8, 7, 6]),
    },
    bindings,
  );
  assert.equal(upload.status, 200);
  const uploaded = await upload.json();

  const blocked = await request(
    uploaded.contentUrl,
    {
      headers: {
        accept: "image/webp",
        cookie: secondCookie,
        "x-workspace-id": sharedSyncCode,
      },
    },
    bindings,
  );
  assert.equal(blocked.status, 400);

  const allowed = await request(
    uploaded.contentUrl,
    {
      headers: {
        accept: "image/webp",
        cookie: firstCookie,
      },
    },
    bindings,
  );
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.arrayBuffer()).byteLength, 8);

  const job = {
    id: "cgt-test-recovery",
    status: "queued",
    progress: 8,
    model: "doubao-seedance-2-0-260128",
    prompt: "红金婚礼电影预告片，真实自然光线",
    ratio: "16:9",
    seconds: 8,
    title: "可恢复的视频任务",
    style: "复古电影",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: 1,
  };
  const firstScope = `user-${firstUser.id}`;
  values.set(`video-jobs:${firstScope}`, JSON.stringify([job.id]));
  values.set(`video-job:${firstScope}:${job.id}`, JSON.stringify(job));

  const firstJobs = await request(
    "/api/media/jobs",
    { headers: { accept: "application/json", cookie: firstCookie } },
    bindings,
  );
  assert.equal((await firstJobs.json()).jobs[0].title, "可恢复的视频任务");

  const secondJobs = await request(
    "/api/media/jobs",
    { headers: { accept: "application/json", cookie: secondCookie } },
    bindings,
  );
  assert.deepEqual((await secondJobs.json()).jobs, []);
});

test("verifies email and resets a forgotten password with one-time codes", async () => {
  const values = new Map();
  const store = {
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
  };
  const bindings = { WEDDING_DATA: store };
  const email = "recovery@example.com";
  const registration = await request(
    "/api/auth/register",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: "original-password-2026",
        displayName: "找回密码新人",
        acceptedTerms: true,
      }),
    },
    bindings,
  );
  const registered = await registration.json();
  assert.equal(registration.status, 201);
  assert.match(registered.devCode, /^\d{6}$/);

  const verification = await request(
    "/api/auth/verify/confirm",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, code: registered.devCode }),
    },
    bindings,
  );
  const oldCookie = verification.headers.get("set-cookie").split(";")[0];
  assert.equal(verification.status, 200);

  const requested = await request(
    "/api/auth/password/request",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email }),
    },
    bindings,
  );
  const resetRequest = await requested.json();
  assert.match(resetRequest.devCode, /^\d{6}$/);

  const reset = await request(
    "/api/auth/password/reset",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        code: resetRequest.devCode,
        password: "updated-password-2026",
      }),
    },
    bindings,
  );
  assert.equal(reset.status, 200);

  const oldSession = await request(
    "/api/auth/me",
    { headers: { accept: "application/json", cookie: oldCookie } },
    bindings,
  );
  assert.equal((await oldSession.json()).authenticated, false);

  const oldPassword = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password: "original-password-2026" }),
    },
    bindings,
  );
  assert.equal(oldPassword.status, 401);

  const newPassword = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password: "updated-password-2026" }),
    },
    bindings,
  );
  assert.equal(newPassword.status, 200);
});

test("ships queue and cron handlers for durable video job recovery", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("background-test", `${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  assert.equal(typeof worker.queue, "function");
  assert.equal(typeof worker.scheduled, "function");

  const now = new Date().toISOString();
  const scopeId = "user-background-test";
  const id = "cgt-background-test";
  const values = new Map([
    [
      `video-job:${scopeId}:${id}`,
      JSON.stringify({
        id,
        status: "in_progress",
        progress: 55,
        model: "doubao-seedance-2-0-260128",
        prompt: "红金婚礼电影预告片，真实自然光线",
        ratio: "16:9",
        seconds: 8,
        title: "后台任务",
        style: "复古电影",
        createdAt: now,
        updatedAt: now,
        attempts: 1,
        backgroundMode: "queue",
      }),
    ],
  ]);
  const store = {
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.match(String(input), /contents\/generations\/tasks\/cgt-background-test/);
    return Response.json({
      id,
      status: "succeeded",
      content: { video_url: "https://media.example.com/result.mp4" },
    });
  };
  let acknowledged = false;
  try {
    await worker.queue(
      {
        messages: [
          {
            body: { scopeId, id },
            ack() {
              acknowledged = true;
            },
            retry() {
              assert.fail("completed task should not retry");
            },
          },
        ],
      },
      {
        ARK_API_KEY: "test-ark-server-key",
        WEDDING_DATA: store,
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(acknowledged, true);
  const completed = JSON.parse(values.get(`video-job:${scopeId}:${id}`));
  assert.equal(completed.status, "completed");
  assert.equal(completed.progress, 100);
});

test("stores and removes media objects in the cloud library", async () => {
  const objects = new Map();
  const bucket = {
    async put(key, value, options) {
      objects.set(key, {
        bytes: value,
        contentType: options?.httpMetadata?.contentType,
      });
    },
    async get(key) {
      const object = objects.get(key);
      if (!object) return null;
      return {
        size: object.bytes.byteLength,
        httpMetadata: { contentType: object.contentType },
        async arrayBuffer() {
          return object.bytes;
        },
      };
    },
    async delete(key) {
      objects.delete(key);
    },
  };
  const syncCode = "xy-test-cloud-library-20260723";
  const upload = await request(
    "/api/library",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "image/webp",
        "x-workspace-id": syncCode,
      },
      body: new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]),
    },
    { MEDIA_BUCKET: bucket },
  );
  assert.equal(upload.status, 200);
  const uploaded = await upload.json();
  assert.equal(uploaded.storage, "cloud-r2");

  const content = await request(
    uploaded.contentUrl,
    { headers: { accept: "image/webp" } },
    { MEDIA_BUCKET: bucket },
  );
  assert.equal(content.status, 200);
  assert.equal(content.headers.get("content-type"), "image/webp");
  assert.equal((await content.arrayBuffer()).byteLength, 8);

  const removed = await request(
    `/api/library?key=${encodeURIComponent(uploaded.key)}`,
    {
      method: "DELETE",
      headers: {
        accept: "application/json",
        "x-workspace-id": syncCode,
      },
    },
    { MEDIA_BUCKET: bucket },
  );
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).deleted, true);

  const contractUpload = await request(
    "/api/library",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/pdf",
        "x-workspace-id": syncCode,
      },
      body: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]),
    },
    { MEDIA_BUCKET: bucket },
  );
  assert.equal(contractUpload.status, 200);
  const contract = await contractUpload.json();
  assert.match(contract.key, /\.pdf$/);
  const contractContent = await request(
    contract.contentUrl,
    { headers: { accept: "application/pdf" } },
    { MEDIA_BUCKET: bucket },
  );
  assert.equal(contractContent.status, 200);
  assert.equal(contractContent.headers.get("content-type"), "application/pdf");
});

test("serves the guest RSVP page and validates invitation storage availability", async () => {
  const page = await request("/rsvp/ABCDEF123456");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /正在打开婚礼邀请/);

  const invalid = await request("/api/rsvp?code=bad-code", {
    headers: { accept: "application/json" },
  });
  assert.equal(invalid.status, 400);

  const unavailable = await request(
    "/api/rsvp",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-workspace-id": "xy-rsvp-test-unavailable-20260725",
      },
      body: JSON.stringify({
        guest: { id: 1, name: "测试宾客", relation: "好友", count: 2 },
        profile: {
          brideName: "小喜",
          groomName: "小缘",
          weddingDate: "2026-10-01",
          city: "杭州",
        },
      }),
    },
  );
  assert.equal(unavailable.status, 503);
});

test("exposes media service configuration without leaking credentials", async () => {
  const response = await request("/api/media/config", {
    headers: { accept: "application/json" },
  });
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(typeof payload.configured, "boolean");
  assert.equal(payload.copy.provider, "DeepSeek");
  assert.equal(payload.image.provider, "豆包 Seedream");
  assert.equal(payload.video.provider, "Seedance 2.0");
  assert.equal(typeof payload.copy.model, "string");
  assert.equal(typeof payload.image.model, "string");
  assert.equal(typeof payload.video.model, "string");
  assert.equal("apiKey" in payload.copy, false);
  assert.equal("apiKey" in payload.image, false);
});

test("accepts browser-provided provider keys without echoing them", async () => {
  const response = await request("/api/media/config", {
    headers: {
      accept: "application/json",
      "x-deepseek-api-key": "sk-test-deepseek-key",
      "x-ark-api-key": "test-ark-browser-key",
    },
  });
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.configured, true);
  assert.equal(payload.copy.source, "browser");
  assert.equal(payload.image.source, "browser");
  assert.equal(payload.video.source, "browser");
  assert.doesNotMatch(JSON.stringify(payload), /sk-test-deepseek-key|test-ark-browser-key/);
});

test("validates copywriting requirements before calling DeepSeek", async () => {
  const response = await request("/api/copywriting", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      kind: "请柬文案",
      tone: "温柔正式",
      brief: "短",
      profile: {},
    }),
  });
  assert.equal(response.status, 400);

  const payload = await response.json();
  assert.match(payload.error, /至少输入 4 个字/);
});

test("validates image prompts before calling the upstream service", async () => {
  const response = await request("/api/media/image", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ prompt: "太短", ratio: "1:1" }),
  });
  assert.equal(response.status, 400);

  const payload = await response.json();
  assert.match(payload.error, /至少输入 8 个字/);
});

test("rejects invalid video job ids before polling upstream", async () => {
  const response = await request("/api/media/video?id=invalid", {
    headers: { accept: "application/json" },
  });
  assert.equal(response.status, 400);

  const payload = await response.json();
  assert.match(payload.error, /任务编号无效/);
});

test("requires a source photo before generating an AI ID portrait", async () => {
  const formData = new FormData();
  formData.set("prompt", "正式登记证件照，红色纯色背景");
  const response = await request("/api/media/portrait", {
    method: "POST",
    body: formData,
    headers: { accept: "application/json" },
  });
  assert.equal(response.status, 400);

  const payload = await response.json();
  assert.match(payload.error, /上传一张清晰的本人正面照片/);
});

test("removes starter preview wiring", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /WeddingPlanner/);
  assert.match(layout, /喜缘 · AI 备婚搭子/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page + layout, /codex-preview|_sites-preview|Starter Project/);
});

test("ships optimized local media previews", async () => {
  const [ceremony, film] = await Promise.all([
    readFile(new URL("../public/media-red-gold-ceremony.webp", import.meta.url)),
    readFile(new URL("../public/media-red-gold-film.webp", import.meta.url)),
  ]);

  assert.ok(ceremony.byteLength > 10000);
  assert.ok(film.byteLength > 10000);
  assert.ok(ceremony.byteLength < 500000);
  assert.ok(film.byteLength < 500000);
});

test("supports team invitations, shared workspaces, viewer access, notifications, and plan limits", async () => {
  const values = new Map();
  const store = {
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
  };
  const bindings = { WEDDING_DATA: store };
  const jsonHeaders = {
    accept: "application/json",
    "content-type": "application/json",
  };
  const register = async (email, displayName) => {
    const response = await request(
      "/api/auth/register",
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          email,
          password: "team-test-password-2026",
          displayName,
          acceptedTerms: true,
        }),
      },
      bindings,
    );
    assert.equal(response.status, 201);
    const registration = await response.json();
    const verified = await request(
      "/api/auth/verify/confirm",
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ email, code: registration.devCode }),
      },
      bindings,
    );
    assert.equal(verified.status, 200);
    return verified.headers.get("set-cookie").split(";")[0];
  };

  const ownerCookie = await register("owner-team@example.com", "Owner");
  const editorCookie = await register("editor-team@example.com", "Editor");
  const viewerCookie = await register("viewer-team@example.com", "Viewer");
  const ownerSession = await request(
    "/api/auth/me",
    { headers: { accept: "application/json", cookie: ownerCookie } },
    bindings,
  );
  const owner = (await ownerSession.json()).user;

  const createInvite = async (email, role) => {
    const response = await request(
      "/api/collaboration",
      {
        method: "POST",
        headers: { ...jsonHeaders, cookie: ownerCookie },
        body: JSON.stringify({ email, role }),
      },
      bindings,
    );
    return { response, payload: await response.json() };
  };
  const acceptInvite = async (cookie, code) => {
    const response = await request(
      "/api/collaboration",
      {
        method: "POST",
        headers: { ...jsonHeaders, cookie },
        body: JSON.stringify({ action: "accept", code }),
      },
      bindings,
    );
    assert.equal(response.status, 200);
  };

  const editorInvite = await createInvite("editor-team@example.com", "editor");
  assert.equal(editorInvite.response.status, 201);
  assert.match(editorInvite.payload.code, /^[A-Z2-9]{10}$/);
  await acceptInvite(editorCookie, editorInvite.payload.code);

  const freeLimit = await createInvite("viewer-team@example.com", "viewer");
  assert.equal(freeLimit.response.status, 400);

  values.set(
    `billing:${owner.id}`,
    JSON.stringify({
      ownerId: owner.id,
      plan: "pro",
      status: "active",
      updatedAt: new Date().toISOString(),
    }),
  );
  const viewerInvite = await createInvite("viewer-team@example.com", "viewer");
  assert.equal(viewerInvite.response.status, 201);
  await acceptInvite(viewerCookie, viewerInvite.payload.code);

  const ownerSave = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers: { ...jsonHeaders, cookie: ownerCookie },
      body: JSON.stringify({
        workspace: { profile: { brideName: "Shared wedding" } },
      }),
    },
    bindings,
  );
  assert.equal(ownerSave.status, 200);

  const editorRead = await request(
    "/api/workspace",
    { headers: { accept: "application/json", cookie: editorCookie } },
    bindings,
  );
  assert.equal(editorRead.status, 200);
  assert.equal(
    (await editorRead.json()).data.workspace.profile.brideName,
    "Shared wedding",
  );
  const editorWrite = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers: { ...jsonHeaders, cookie: editorCookie },
      body: JSON.stringify({
        workspace: { profile: { brideName: "Edited together" } },
      }),
    },
    bindings,
  );
  assert.equal(editorWrite.status, 200);

  const viewerRead = await request(
    "/api/workspace",
    { headers: { accept: "application/json", cookie: viewerCookie } },
    bindings,
  );
  assert.equal(viewerRead.status, 200);
  assert.equal(
    (await viewerRead.json()).data.workspace.profile.brideName,
    "Edited together",
  );
  const viewerWrite = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers: { ...jsonHeaders, cookie: viewerCookie },
      body: JSON.stringify({
        workspace: { profile: { brideName: "Blocked edit" } },
      }),
    },
    bindings,
  );
  assert.equal(viewerWrite.status, 403);

  const team = await request(
    "/api/collaboration",
    { headers: { accept: "application/json", cookie: ownerCookie } },
    bindings,
  );
  const teamOverview = await team.json();
  assert.equal(teamOverview.members.length, 3);
  assert.equal(teamOverview.members[0].role, "owner");
  assert.ok(teamOverview.audit.length >= 4);

  const savedPreferences = await request(
    "/api/notifications",
    {
      method: "POST",
      headers: { ...jsonHeaders, cookie: editorCookie },
      body: JSON.stringify({
        preferences: {
          inApp: true,
          email: false,
          sms: false,
          wechat: false,
          phone: "",
        },
      }),
    },
    bindings,
  );
  assert.equal(savedPreferences.status, 200);
  assert.equal((await savedPreferences.json()).email, false);

  const notificationTest = await request(
    "/api/notifications",
    {
      method: "POST",
      headers: { ...jsonHeaders, cookie: editorCookie },
      body: JSON.stringify({ action: "test" }),
    },
    bindings,
  );
  assert.equal(notificationTest.status, 200);
  assert.deepEqual((await notificationTest.json()).delivered, []);
  const notifications = await request(
    "/api/notifications",
    { headers: { accept: "application/json", cookie: editorCookie } },
    bindings,
  );
  assert.equal((await notifications.json()).unread, 1);

  const billing = await request(
    "/api/billing",
    { headers: { accept: "application/json", cookie: ownerCookie } },
    bindings,
  );
  const billingData = await billing.json();
  assert.equal(billingData.record.plan, "pro");
  assert.equal(billingData.plan.memberLimit, 8);

  const stripeEnvironment = {
    secret: process.env.STRIPE_SECRET_KEY,
    pro: process.env.STRIPE_PRO_PRICE_ID,
    studio: process.env.STRIPE_STUDIO_PRICE_ID,
  };
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRO_PRICE_ID;
  delete process.env.STRIPE_STUDIO_PRICE_ID;
  try {
    const checkout = await request(
      "/api/billing",
      {
        method: "POST",
        headers: { ...jsonHeaders, cookie: ownerCookie },
        body: JSON.stringify({ plan: "studio" }),
      },
      bindings,
    );
    assert.equal(checkout.status, 400);
    assert.equal("url" in (await checkout.json()), false);
  } finally {
    if (stripeEnvironment.secret) {
      process.env.STRIPE_SECRET_KEY = stripeEnvironment.secret;
    }
    if (stripeEnvironment.pro) {
      process.env.STRIPE_PRO_PRICE_ID = stripeEnvironment.pro;
    }
    if (stripeEnvironment.studio) {
      process.env.STRIPE_STUDIO_PRICE_ID = stripeEnvironment.studio;
    }
  }
});

test("enforces shared AI quota, refunds failed calls, and bypasses platform billing for user keys", async () => {
  const store = createMemoryStore();
  const bindings = { WEDDING_DATA: store };
  const cookie = await registerVerifiedAccount(
    bindings,
    "usage-owner@example.com",
    "Usage Owner",
  );
  const session = await request(
    "/api/auth/me",
    { headers: { accept: "application/json", cookie } },
    bindings,
  );
  const owner = (await session.json()).user;
  const previousKey = process.env.DEEPSEEK_API_KEY;
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  process.env.DEEPSEEK_API_KEY = "sk-platform-test-key";
  globalThis.fetch = async (input) => {
    assert.match(String(input), /deepseek/i);
    providerCalls += 1;
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "Wedding invitation",
              content: "A complete invitation generated for testing.",
            }),
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
  };
  const body = JSON.stringify({
    kind: "请柬文案",
    tone: "温柔正式",
    brief: "请生成一份可以直接发送给亲友的完整婚礼邀请文案",
    profile: {},
  });
  try {
    const generated = await request(
      "/api/copywriting",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie,
        },
        body,
      },
      bindings,
    );
    assert.equal(generated.status, 200);

    const afterSuccess = await request(
      "/api/usage",
      { headers: { accept: "application/json", cookie } },
      bindings,
    );
    const successUsage = await afterSuccess.json();
    assert.equal(successUsage.record.usedUnits, 1);
    assert.equal(successUsage.record.reservedUnits, 0);
    assert.equal(successUsage.record.estimatedCostCny, 0.02);

    globalThis.fetch = async () =>
      Response.json(
        { error: { message: "provider temporarily unavailable" } },
        { status: 503 },
      );
    const failed = await request(
      "/api/copywriting",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie,
        },
        body,
      },
      bindings,
    );
    assert.equal(failed.status, 503);
    const afterFailure = await request(
      "/api/usage",
      { headers: { accept: "application/json", cookie } },
      bindings,
    );
    const failedUsage = await afterFailure.json();
    assert.equal(failedUsage.record.usedUnits, 1);
    assert.equal(failedUsage.record.reservedUnits, 0);
    assert.equal(failedUsage.record.refundedUnits, 1);

    globalThis.fetch = async () => {
      providerCalls += 1;
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "User key result",
                content: "This request uses the browser key.",
              }),
            },
          },
        ],
      });
    };
    const userKeyCall = await request(
      "/api/copywriting",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie,
          "x-deepseek-api-key": "sk-browser-owned-key",
        },
        body,
      },
      bindings,
    );
    assert.equal(userKeyCall.status, 200);
    const afterUserKey = await request(
      "/api/usage",
      { headers: { accept: "application/json", cookie } },
      bindings,
    );
    assert.equal((await afterUserKey.json()).record.usedUnits, 1);

    const month = new Date().toISOString().slice(0, 7);
    const current = JSON.parse(store.values.get(`ai:usage:${owner.id}:${month}`));
    store.values.set(
      `ai:usage:${owner.id}:${month}`,
      JSON.stringify({
        ...current,
        usedUnits: 30,
        reservedUnits: 0,
      }),
    );
    const callsBeforeLimit = providerCalls;
    const blocked = await request(
      "/api/copywriting",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie,
        },
        body,
      },
      bindings,
    );
    assert.equal(blocked.status, 402);
    assert.equal(providerCalls, callsBeforeLimit);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey) process.env.DEEPSEEK_API_KEY = previousKey;
    else delete process.env.DEEPSEEK_API_KEY;
  }
});

test("runs deduplicated wedding reminders and protects the operations dashboard", async () => {
  const store = createMemoryStore();
  const bindings = { WEDDING_DATA: store };
  const previousAdmins = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "ops-admin@example.com";
  try {
    const adminCookie = await registerVerifiedAccount(
      bindings,
      "ops-admin@example.com",
      "Operations Admin",
    );
    const memberCookie = await registerVerifiedAccount(
      bindings,
      "regular-member@example.com",
      "Regular Member",
    );
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const yesterday = new Date(`${today}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const overdueDate = yesterday.toISOString().slice(0, 10);

    const preferences = await request(
      "/api/notifications",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          preferences: {
            inApp: true,
            email: false,
            sms: false,
            wechat: false,
            phone: "",
          },
        }),
      },
      bindings,
    );
    assert.equal(preferences.status, 200);

    const saved = await request(
      "/api/workspace",
      {
        method: "PUT",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          workspace: {
            profile: { weddingDate: today, budgetCap: 100 },
            taskList: [
              {
                id: 1,
                title: "Confirm ceremony supplies",
                status: "进行中",
                dueDate: overdueDate,
              },
            ],
            budgetList: [{ total: 200, paid: 50 }],
          },
        }),
      },
      bindings,
    );
    assert.equal(saved.status, 200);

    const preview = await request(
      "/api/reminders",
      { headers: { accept: "application/json", cookie: adminCookie } },
      bindings,
    );
    const reminderPreview = await preview.json();
    assert.ok(reminderPreview.rules.length >= 3);

    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("reminder-test", `${Date.now()}`);
    const { default: worker } = await import(workerUrl.href);
    let firstRun;
    await worker.scheduled(
      {
        cron: "0 1 * * *",
        scheduledTime: Date.now(),
      },
      bindings,
      {
        waitUntil(promise) {
          firstRun = promise;
        },
      },
    );
    const firstResult = await firstRun;
    assert.equal(firstResult.scanned, 1);
    assert.ok(firstResult.sent >= 3);

    let secondRun;
    await worker.scheduled(
      {
        cron: "0 1 * * *",
        scheduledTime: Date.now(),
      },
      bindings,
      {
        waitUntil(promise) {
          secondRun = promise;
        },
      },
    );
    assert.equal((await secondRun).sent, 0);

    const notifications = await request(
      "/api/notifications",
      { headers: { accept: "application/json", cookie: adminCookie } },
      bindings,
    );
    assert.ok((await notifications.json()).unread >= 3);

    const denied = await request(
      "/api/admin",
      { headers: { accept: "application/json", cookie: memberCookie } },
      bindings,
    );
    assert.equal(denied.status, 403);

    const incidentId = "11111111-1111-4111-8111-111111111111";
    await store.put(
      "ops:incidents",
      JSON.stringify([
        {
          id: incidentId,
          createdAt: new Date().toISOString(),
          source: "test-monitor",
          severity: "error",
          code: "test_incident",
          message: "Test incident awaiting review",
          state: "open",
        },
      ]),
    );
    const dashboard = await request(
      "/api/admin",
      { headers: { accept: "application/json", cookie: adminCookie } },
      bindings,
    );
    const dashboardData = await dashboard.json();
    assert.equal(dashboard.status, 200);
    assert.equal(dashboardData.metrics.users, 2);
    assert.equal(dashboardData.metrics.workspaces, 1);
    assert.equal(dashboardData.operations.incidents[0].state, "open");
    const adminOwner = dashboardData.owners.find(
      (owner) => owner.user?.email === "ops-admin@example.com",
    );
    assert.ok(adminOwner);

    const grant = await request(
      "/api/admin",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          action: "grant_quota",
          ownerId: adminOwner.ownerId,
          units: 75,
        }),
      },
      bindings,
    );
    assert.equal(grant.status, 200);
    const usage = await request(
      "/api/usage",
      { headers: { accept: "application/json", cookie: adminCookie } },
      bindings,
    );
    const usageData = await usage.json();
    assert.equal(usageData.bonus, 75);
    assert.equal(usageData.allowance, 105);

    const auditExport = await request(
      "/api/collaboration/audit/export",
      { headers: { accept: "text/csv", cookie: adminCookie } },
      bindings,
    );
    assert.equal(auditExport.status, 200);
    assert.match(
      auditExport.headers.get("content-disposition") || "",
      /xiyuan-audit-/,
    );
    const auditCsv = await auditExport.text();
    assert.match(auditCsv, /时间,|\"时间\"/);
    assert.match(auditCsv, /保存工作区/);

    const resolved = await request(
      "/api/operations",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          action: "resolve_incident",
          incidentId,
        }),
      },
      bindings,
    );
    assert.equal(resolved.status, 200);
    const resolvedData = await resolved.json();
    assert.equal(resolvedData.incident.state, "resolved");
    assert.equal(resolvedData.incident.resolvedBy, "ops-admin@example.com");

    const recoveryDrill = await request(
      "/api/admin",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({ action: "run_recovery_drill" }),
      },
      bindings,
    );
    assert.equal(recoveryDrill.status, 200);
    const drillData = await recoveryDrill.json();
    assert.equal(drillData.migration.kind, "recovery-drill");
    assert.equal(drillData.migration.scanned, 1);

    const migrationWithoutDatabase = await request(
      "/api/admin",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({ action: "migrate_workspaces" }),
      },
      bindings,
    );
    assert.equal(migrationWithoutDatabase.status, 400);
  } finally {
    if (previousAdmins) process.env.ADMIN_EMAILS = previousAdmins;
    else delete process.env.ADMIN_EMAILS;
  }
});

test("creates integrity-checked workspace versions and restores a previous backup", async () => {
  const store = createMemoryStore();
  const bindings = { WEDDING_DATA: store };
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "x-workspace-id": "xy-backup-test-20260724",
  };

  const first = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        workspace: { profile: { brideName: "第一版新娘" } },
      }),
    },
    bindings,
  );
  assert.equal(first.status, 200);

  const second = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        workspace: { profile: { brideName: "第二版新娘" } },
      }),
    },
    bindings,
  );
  assert.equal(second.status, 200);

  const versions = await request(
    "/api/backups",
    { headers },
    bindings,
  );
  assert.equal(versions.status, 200);
  const versionData = await versions.json();
  assert.equal(versionData.retentionDays, 180);
  assert.equal(versionData.backups.length, 1);

  const manual = await request(
    "/api/backups",
    {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "create" }),
    },
    bindings,
  );
  assert.equal(manual.status, 200);
  const manualData = await manual.json();
  assert.equal(manualData.created, true);
  assert.equal(manualData.backup.reason, "manual");

  const exported = await request(
    "/api/backups/export",
    { headers },
    bindings,
  );
  assert.equal(exported.status, 200);
  assert.match(
    exported.headers.get("content-disposition") || "",
    /xiyuan-workspace-/,
  );
  const exportData = await exported.json();
  assert.equal(exportData.format, "xiyuan-workspace-export");
  assert.equal(exportData.data.workspace.profile.brideName, "第二版新娘");
  assert.equal(exportData.checksum, exportData.data.checksum);

  const restored = await request(
    "/api/backups",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "restore",
        snapshotId: versionData.backups[0].id,
      }),
    },
    bindings,
  );
  assert.equal(restored.status, 200);

  const workspace = await request(
    "/api/workspace",
    { headers },
    bindings,
  );
  const workspaceData = await workspace.json();
  assert.equal(workspace.status, 200);
  assert.equal(
    workspaceData.data.workspace.profile.brideName,
    "第一版新娘",
  );
  assert.match(workspaceData.data.checksum, /^[A-Za-z0-9_-]{20,}$/);

  const currentKey = "workspace:code:xy-backup-test-20260724";
  const tampered = JSON.parse(store.values.get(currentKey));
  tampered.workspace.profile.brideName = "被篡改的数据";
  store.values.set(currentKey, JSON.stringify(tampered));
  const blocked = await request(
    "/api/workspace",
    { headers },
    bindings,
  );
  assert.equal(blocked.status, 500);
  assert.equal((await blocked.json()).error.includes("完整性"), true);
  const blockedAgain = await request(
    "/api/workspace",
    { headers },
    bindings,
  );
  assert.equal(blockedAgain.status, 500);
  const incidents = JSON.parse(store.values.get("ops:incidents"));
  const integrityIncident = incidents.find(
    (incident) => incident.code === "workspace_checksum_mismatch",
  );
  assert.equal(integrityIncident.occurrences, 2);
});

test("applies request security, rate limiting, health checks, and monitoring data", async () => {
  const store = createMemoryStore();
  const bindings = { WEDDING_DATA: store };

  const page = await request("/", {}, bindings);
  assert.equal(page.headers.get("x-frame-options"), "DENY");
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.match(
    page.headers.get("content-security-policy") || "",
    /frame-ancestors 'none'/,
  );

  const crossSite = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify({ email: "a@example.com", password: "password1" }),
    },
    bindings,
  );
  assert.equal(crossSite.status, 403);
  assert.equal((await crossSite.json()).code, "cross_site_request");

  let limited;
  for (let index = 0; index < 31; index += 1) {
    limited = await request(
      "/api/auth/login",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      },
      bindings,
    );
  }
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);

  const health = await request(
    "/api/health",
    { headers: { accept: "application/json" } },
    bindings,
  );
  assert.equal(health.status, 200);
  const healthData = await health.json();
  assert.equal(healthData.status, "degraded");
  assert.equal(healthData.services.dataStore, true);
  assert.equal(healthData.services.database, false);

  const operations = await request(
    "/api/operations",
    { headers: { accept: "application/json" } },
    bindings,
  );
  assert.equal(operations.status, 401);

  const clientError = await request(
    "/api/client-errors",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "RenderError",
        message: "Test client render failure",
        path: "/test-view",
      }),
    },
    bindings,
  );
  assert.equal(clientError.status, 200);
  assert.equal((await clientError.json()).recorded, true);
  const clientIncidents = JSON.parse(store.values.get("ops:incidents"));
  assert.ok(
    clientIncidents.some(
      (incident) =>
        incident.source === "client-ui" && incident.code === "RenderError",
    ),
  );

  const missingPage = await request("/a-page-that-does-not-exist", {}, bindings);
  assert.equal(missingPage.status, 404);
  assert.match(await missingPage.text(), /没有找到这个页面/);
});

test("lists account devices and revokes other sessions without exposing tokens", async () => {
  const store = createMemoryStore();
  const bindings = { WEDDING_DATA: store };
  const firstCookie = await registerVerifiedAccount(
    bindings,
    "devices@example.com",
    "Device Owner",
  );
  const secondLogin = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36",
      },
      body: JSON.stringify({
        email: "devices@example.com",
        password: "verified-test-password-2026",
      }),
    },
    bindings,
  );
  assert.equal(secondLogin.status, 200);
  const secondCookie = secondLogin.headers.get("set-cookie").split(";")[0];

  const listed = await request(
    "/api/auth/sessions",
    {
      headers: {
        accept: "application/json",
        cookie: secondCookie,
      },
    },
    bindings,
  );
  assert.equal(listed.status, 200);
  const sessionData = await listed.json();
  assert.equal(sessionData.sessions.length, 2);
  assert.equal(
    sessionData.sessions.filter((session) => session.current).length,
    1,
  );
  assert.equal(
    JSON.stringify(sessionData).includes("tokenHash"),
    false,
  );
  assert.ok(
    sessionData.sessions.some((session) =>
      session.device.includes("Windows · Chrome"),
    ),
  );

  const revoked = await request(
    "/api/auth/sessions",
    {
      method: "DELETE",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie: secondCookie,
      },
      body: JSON.stringify({ action: "revoke_others" }),
    },
    bindings,
  );
  assert.equal(revoked.status, 200);
  assert.equal((await revoked.json()).revoked, 1);

  const oldSession = await request(
    "/api/auth/me",
    { headers: { accept: "application/json", cookie: firstCookie } },
    bindings,
  );
  assert.equal((await oldSession.json()).authenticated, false);
  const currentSession = await request(
    "/api/auth/me",
    { headers: { accept: "application/json", cookie: secondCookie } },
    bindings,
  );
  assert.equal((await currentSession.json()).authenticated, true);
});

test("records privacy consent and performs cancellable delayed account deletion", async () => {
  const store = createMemoryStore();
  const objects = new Map([
    ["user-placeholder/keep.webp", new Uint8Array([1]).buffer],
  ]);
  const bucket = {
    async list({ prefix = "" } = {}) {
      return {
        objects: [...objects.keys()]
          .filter((key) => key.startsWith(prefix))
          .map((key) => ({ key })),
        truncated: false,
      };
    },
    async delete(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        objects.delete(key);
      }
    },
  };
  const bindings = { WEDDING_DATA: store, MEDIA_BUCKET: bucket };

  const rejected = await request(
    "/api/auth/register",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "no-consent@example.com",
        password: "privacy-test-password",
        displayName: "No Consent",
      }),
    },
    bindings,
  );
  assert.equal(rejected.status, 400);
  assert.equal((await rejected.json()).code, "consent_required");

  const cookie = await registerVerifiedAccount(
    bindings,
    "lifecycle@example.com",
    "Lifecycle Owner",
  );
  const me = await request(
    "/api/auth/me",
    { headers: { accept: "application/json", cookie } },
    bindings,
  );
  const user = (await me.json()).user;
  objects.set(`user-${user.id}/portrait.webp`, new Uint8Array([1, 2]).buffer);

  const privacy = await request(
    "/api/privacy",
    { headers: { accept: "application/json", cookie } },
    bindings,
  );
  assert.equal(privacy.status, 200);
  const privacyData = await privacy.json();
  assert.equal(privacyData.current, true);
  assert.equal(privacyData.consent.source, "registration");

  const workspace = await request(
    "/api/workspace",
    {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        workspace: { profile: { brideName: "待注销资料" } },
      }),
    },
    bindings,
  );
  assert.equal(workspace.status, 200);

  const requested = await request(
    "/api/account",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ confirmation: "注销喜缘账号" }),
    },
    bindings,
  );
  assert.equal(requested.status, 200);
  assert.equal((await requested.json()).deletion.status, "pending");

  const cancelled = await request(
    "/api/account",
    {
      method: "DELETE",
      headers: { accept: "application/json", cookie },
    },
    bindings,
  );
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).deletion.status, "cancelled");

  await request(
    "/api/account",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ confirmation: "注销喜缘账号" }),
    },
    bindings,
  );
  const deletionKey = `account:deletion:${user.id}`;
  const due = JSON.parse(store.values.get(deletionKey));
  due.scheduledFor = new Date(Date.now() - 1000).toISOString();
  store.values.set(deletionKey, JSON.stringify(due));

  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("lifecycle-test", `${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  let scheduled;
  await worker.scheduled(
    { cron: "0 1 * * *", scheduledTime: Date.now() },
    bindings,
    {
      waitUntil(promise) {
        scheduled = promise;
      },
    },
  );
  await scheduled;
  assert.equal(store.values.has(`workspace:user:${user.id}`), false);
  assert.equal(store.values.has(`privacy:consent:${user.id}`), false);
  assert.equal(store.values.has(deletionKey), false);
  assert.equal(objects.has(`user-${user.id}/portrait.webp`), false);

  const afterDeletion = await request(
    "/api/auth/me",
    { headers: { accept: "application/json", cookie } },
    bindings,
  );
  assert.equal((await afterDeletion.json()).authenticated, false);
});
