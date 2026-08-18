import { prisma } from "./prisma";

// Append-only audit trail (spec §27). Call for every state-changing action that matters:
// approvals/rejections, upgrade decisions, admin corrections to progression data.
export async function writeAudit(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  // Snapshot the actor's name now — the committee turns over every couple of years and old
  // accounts get deleted, but the trail still needs to read who did it, so it can't rely on the
  // live User relation (which SetNulls to nothing once that account is gone).
  const actor = params.actorId ? await prisma.user.findUnique({ where: { id: params.actorId }, select: { name: true } }) : null;

  await prisma.auditEvent.create({
    data: {
      actorId: params.actorId,
      actorName: actor?.name ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeJson: params.before === undefined ? undefined : (params.before as any),
      afterJson: params.after === undefined ? undefined : (params.after as any),
    },
  });
}
