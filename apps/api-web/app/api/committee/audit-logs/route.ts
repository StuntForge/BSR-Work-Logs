import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, unauthorized, forbidden, serverError } from "@/lib/http";

const RETENTION_DAYS = 90;

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// Builds the single human-readable sentence for one AuditEvent, given the resolved target name.
function describe(action: string, targetName: string, afterJson: unknown): string {
  const after = (afterJson ?? {}) as Record<string, unknown>;
  switch (action) {
    case "MEMBER_CREATED":
      return `created a new member account for ${targetName}`;
    case "PASSWORD_RESET":
      return `reset ${targetName}'s password`;
    case "HEALTH_SAFETY_LEVEL_SET":
      return `set ${targetName}'s Health & Safety level to ${after.level ?? "?"}`;
    case "UPGRADE_APPROVED":
      return `approved ${targetName}'s upgrade application`;
    case "UPGRADE_REJECTED":
      return `rejected ${targetName}'s upgrade application`;
    case "MEMBER_UPDATED": {
      const clauses: string[] = [];
      if (after.dateJoined !== undefined) clauses.push(`Date Joined`);
      if (after.lastUpgradedAt !== undefined) clauses.push(`Last Upgraded date`);
      if (after.active !== undefined) clauses.push(after.active ? "reactivated the account" : "deactivated the account");
      if (after.correctGrade !== undefined) clauses.push("corrected the grade");
      if (after.name !== undefined) clauses.push("name");
      if (after.email !== undefined) clauses.push("email");
      if (clauses.length === 0) return `updated ${targetName}'s account`;
      return `changed ${targetName}'s ${clauses.join(", ")}`;
    }
    default:
      return `performed ${action} on ${targetName}`;
  }
}

// GET /api/committee/audit-logs — every non-admin portal user's action, newest first. Entries
// older than 90 days are pruned opportunistically on each load rather than needing a separate
// scheduled job — this is a lightweight internal tool, not a system that needs to guarantee
// same-day deletion the moment 90 days ticks over.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.auditEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });

    const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" } });

    const userIds = [...new Set(events.filter((e) => e.entityType === "User").map((e) => e.entityId))];
    const applicationIds = [...new Set(events.filter((e) => e.entityType === "UpgradeApplication").map((e) => e.entityId))];

    const users = userIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
    const applications =
      applicationIds.length > 0
        ? await prisma.upgradeApplication.findMany({ where: { id: { in: applicationIds } }, select: { id: true, user: { select: { name: true } } } })
        : [];

    const userNameById = new Map(users.map((u) => [u.id, u.name]));
    const applicantNameByAppId = new Map(applications.map((a) => [a.id, a.user.name]));

    const entries = events.map((e) => {
      const targetName =
        e.entityType === "User"
          ? userNameById.get(e.entityId) ?? "a deleted account"
          : e.entityType === "UpgradeApplication"
          ? applicantNameByAppId.get(e.entityId) ?? "a deleted application"
          : "an item";

      return {
        id: e.id,
        actorName: e.actorName ?? "Someone",
        description: describe(e.action, targetName, e.afterJson),
        createdAt: e.createdAt,
        createdAtLabel: fmtDate(e.createdAt),
      };
    });

    return ok({ entries });
  } catch (err) {
    return serverError(err);
  }
}
