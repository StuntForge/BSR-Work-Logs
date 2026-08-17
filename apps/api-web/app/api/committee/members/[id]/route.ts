import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { writeAudit } from "@/lib/audit";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  active: z.boolean().optional(),
  // "Correct member/grade data when authorised" + "maintain grade history dates with audit
  // logging" (spec §23) — a direct correction, distinct from the normal committee-approved
  // upgrade flow.
  correctGrade: z.object({ gradeKey: z.string().min(1), startedAt: z.string().min(1) }).optional(),
  dateJoined: z.string().nullable().optional(),
  lastUpgradedAt: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const before = await prisma.user.findUnique({ where: { id: params.id }, include: { currentGrade: true } });
    if (!before) return notFound();

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      const details = body.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
      return badRequest(`Invalid fields — ${details}`);
    }

    await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (body.data.name !== undefined) data.name = body.data.name;
      if (body.data.email !== undefined) data.email = body.data.email.toLowerCase();
      if (body.data.active !== undefined) data.active = body.data.active;
      if (body.data.dateJoined !== undefined) data.dateJoined = body.data.dateJoined ? new Date(body.data.dateJoined) : null;
      if (body.data.lastUpgradedAt !== undefined) data.lastUpgradedAt = body.data.lastUpgradedAt ? new Date(body.data.lastUpgradedAt) : null;

      if (body.data.correctGrade) {
        const grade = await tx.grade.findUnique({ where: { key: body.data.correctGrade.gradeKey as any } });
        if (!grade) throw new Error("INVALID_GRADE");
        await tx.gradeHistory.updateMany({ where: { userId: params.id, endedAt: null }, data: { endedAt: new Date() } });
        await tx.gradeHistory.create({ data: { userId: params.id, gradeId: grade.id, startedAt: new Date(body.data.correctGrade.startedAt) } });
        data.currentGradeId = grade.id;
      }

      if (Object.keys(data).length > 0) {
        await tx.user.update({ where: { id: params.id }, data });
      }
    });

    await writeAudit({
      actorId: session.id,
      action: "MEMBER_UPDATED",
      entityType: "User",
      entityId: params.id,
      before: { name: before.name, email: before.email, active: before.active, gradeKey: before.currentGrade?.key },
      after: body.data,
    });

    return ok({ success: true });
  } catch (err: any) {
    if (err?.message === "INVALID_GRADE") return badRequest("Invalid grade.");
    return serverError(err);
  }
}
