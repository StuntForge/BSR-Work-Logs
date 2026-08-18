import type { SessionUser } from "./auth";

export function isCommitteeSession(session: SessionUser | null): session is SessionUser {
  return !!session?.isCommittee;
}

// The single global administrator — gates Committee Users management and Bug Report responses.
export function isAdminSession(session: SessionUser | null): session is SessionUser {
  return !!session?.isAdmin;
}
