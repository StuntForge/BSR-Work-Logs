import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, unauthorized, forbidden, serverError } from "@/lib/http";

// GET /api/committee/pending-upgrades — four tabs, one per upgrade route (spec §19).
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const applications = await prisma.upgradeApplication.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { submittedAt: "asc" },
    });

    const grades = await prisma.grade.findMany();
    const gradeById = new Map(grades.map((g) => [g.id, g]));

    const tabs: Record<string, unknown[]> = {
      STUNT_PERFORMER: [],
      SENIOR_STUNT_PERFORMER: [],
      KEY_STUNT_PERFORMER: [],
      FULL_MEMBER: [],
    };

    for (const app of applications) {
      const toGrade = gradeById.get(app.toGradeId);
      if (!toGrade || !(toGrade.key in tabs)) continue;
      tabs[toGrade.key].push({
        id: app.id,
        member: app.user,
        submittedAt: app.submittedAt,
      });
    }

    return ok({ tabs });
  } catch (err) {
    return serverError(err);
  }
}
