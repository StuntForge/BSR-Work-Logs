import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { writeAudit } from "@/lib/audit";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({ level: z.number().int().min(0).max(4) });

// PATCH /api/committee/members/:id/health-safety — set a member's H&S level (0-4). Committee-only:
// there is no member-facing way to change this (explicit BSR policy, not self-service).
export async function PATCH(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const member = await prisma.user.findUnique({ where: { id: params.id } });
    if (!member) return notFound();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Level must be a whole number from 0 to 4.");

    const existing = await prisma.qualification.findFirst({ where: { userId: params.id, type: "HEALTH_SAFETY" } });
    const before = existing?.level ?? 0;

    if (existing) {
      await prisma.qualification.update({
        where: { id: existing.id },
        data: { level: body.data.level, status: body.data.level > 0 ? "COMPLETE" : "INCOMPLETE", completedAt: body.data.level > 0 ? new Date() : null },
      });
    } else {
      await prisma.qualification.create({
        data: {
          userId: params.id,
          type: "HEALTH_SAFETY",
          level: body.data.level,
          status: body.data.level > 0 ? "COMPLETE" : "INCOMPLETE",
          completedAt: body.data.level > 0 ? new Date() : null,
        },
      });
    }

    await writeAudit({
      actorId: session.id,
      action: "HEALTH_SAFETY_LEVEL_SET",
      entityType: "User",
      entityId: params.id,
      before: { level: before },
      after: { level: body.data.level },
    });

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
