import { authJson, destroySession } from "../../auth";

export async function POST(request: Request) {
  return authJson(
    { authenticated: false },
    200,
    { "set-cookie": await destroySession(request) },
  );
}
