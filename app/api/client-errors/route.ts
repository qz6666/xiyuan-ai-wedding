import { getCloudflareBinding } from "../cloudflare";
import {
  recordOperationalIncident,
  type OperationsStore,
} from "../operations";

export async function POST(request: Request) {
  const store = await getCloudflareBinding<OperationsStore>("WEDDING_DATA");
  if (!store) {
    return Response.json({ recorded: false }, { status: 503 });
  }
  try {
    const input = (await request.json()) as {
      message?: unknown;
      name?: unknown;
      path?: unknown;
    };
    const message =
      typeof input.message === "string"
        ? input.message.trim().slice(0, 300)
        : "客户端页面异常";
    const name =
      typeof input.name === "string"
        ? input.name.trim().slice(0, 80)
        : "ClientError";
    const path =
      typeof input.path === "string"
        ? input.path.trim().slice(0, 200)
        : undefined;
    await recordOperationalIncident(store, {
      source: "client-ui",
      severity: "warning",
      code: name || "client_error",
      message,
      path,
    });
    return Response.json(
      { recorded: true },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { recorded: false, error: "异常信息格式无效。" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
}
