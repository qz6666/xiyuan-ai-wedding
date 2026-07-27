import {
  reminderOverview,
  runRequestReminders,
} from "../reminders";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const overview = await reminderOverview(request);
  if (!overview) return json({ error: "请先登录后查看自动提醒。" }, 401);
  return json(overview);
}

export async function POST(request: Request) {
  try {
    return json(await runRequestReminders(request));
  } catch (error) {
    const message = error instanceof Error ? error.message : "自动提醒检查失败。";
    return json({ error: message }, message.includes("登录") ? 401 : 403);
  }
}
