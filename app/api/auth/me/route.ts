import { authJson, requestUser } from "../../auth";

export async function GET(request: Request) {
  const user = await requestUser(request);
  return authJson({
    authenticated: Boolean(user),
    user,
  });
}
