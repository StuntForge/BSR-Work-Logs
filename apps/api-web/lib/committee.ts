import type { SessionUser } from "./auth";

export function isCommitteeSession(session: SessionUser | null): session is SessionUser {
  return !!session?.isCommittee;
}
