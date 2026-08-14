import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, generateTempPassword, hashPassword } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { writeAudit } from "@/lib/audit";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// POST /api/committee/members/:id/reset-password (spec §23). No email infra in V1 — the temp
// password is returned once for the committee user to relay to the member directly.
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) return notFound();

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({ where: { id: params.id }, data: { passwordHash, mustChangePassword: true } });
    await writeAudit({ actorId: session.id, action: "PASSWORD_RESET", entityType: "User", entityId: params.id });

    return ok({ tempPassword });
  } catch (err) {
    return serverError(err);
  }
}
