import { requestUser, sha256, type AuthUser } from "./auth";
import {
  canWriteCollaborationRole,
  getCollaborationStore,
  resolveCollaborationScope,
  type CollaborationRole,
} from "./collaboration";

export type DataScope = {
  authenticated: boolean;
  id: string;
  mediaPrefix: string;
  ownerId: string | null;
  role: CollaborationRole | null;
  canWrite: boolean;
  user: AuthUser | null;
  workspaceKey: string;
};

export async function resolveDataScope(request: Request): Promise<DataScope | null> {
  const user = await requestUser(request);
  if (user) {
    const store = await getCollaborationStore();
    const collaboration = store
      ? await resolveCollaborationScope(store, user)
      : { ownerId: user.id, role: "owner" as CollaborationRole };
    const id = `user-${collaboration.ownerId}`;
    return {
      authenticated: true,
      id,
      mediaPrefix: id,
      ownerId: collaboration.ownerId,
      role: collaboration.role,
      canWrite: canWriteCollaborationRole(collaboration.role),
      user,
      workspaceKey: `workspace:user:${collaboration.ownerId}`,
    };
  }

  const authenticatedEmail = request.headers.get("oai-authenticated-user-email")?.trim();
  if (authenticatedEmail) {
    const identity = await sha256(authenticatedEmail.trim().toLowerCase());
    const id = `oai-${identity}`;
    return {
      authenticated: true,
      id,
      mediaPrefix: id,
      ownerId: identity,
      role: "owner",
      canWrite: true,
      user: null,
      workspaceKey: `workspace:user:${identity}`,
    };
  }

  const syncCode = request.headers.get("x-workspace-id")?.trim().toLowerCase() || "";
  if (!/^[a-z0-9-]{16,80}$/i.test(syncCode)) return null;
  return {
    authenticated: false,
    id: `code-${syncCode}`,
    mediaPrefix: syncCode,
    ownerId: null,
    role: null,
    canWrite: true,
    user: null,
    workspaceKey: `workspace:code:${syncCode}`,
  };
}
