import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// GET /api/committee/members/:id/upgrade-history — every upgrade this member has ever had
// approved, newest first. This is the audit trail for "Audit - View Previous Upgrades": each
// entry links to the same review page used for pending applications (it already renders a full
// breakdown for decided applications), so this endpoint only needs the summary row data.
export async function GET(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const member = await prisma.user.findUnique({ where: { id: params.id } });
    if (!member || member.isCommittee) return notFound();

    const applications = await prisma.upgradeApplication.findMany({
      where: { userId: params.id, status: "APPROVED" },
      orderBy: { decidedAt: "desc" },
    });

    const gradeIds = [...new Set(applications.flatMap((a) => [a.fromGradeId, a.toGradeId]))];
    const grades = await prisma.grade.findMany({ where: { id: { in: gradeIds } } });
    const gradeById = new Map(grades.map((g) => [g.id, { key: g.key, label: g.label }]));

    return ok({
      member: { id: member.id, name: member.name },
      history: applications.map((a) => ({
        id: a.id,
        fromGrade: gradeById.get(a.fromGradeId) ?? null,
        toGrade: gradeById.get(a.toGradeId) ?? null,
        decidedAt: a.decidedAt,
        decidedByName: a.decidedByName,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
