import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeProgress } from "@/lib/progress";
import { nextGradeKey, type GradeKey } from "@bsr/shared";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";

// GET /api/upgrade-applications — the current member's own application history.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const applications = await prisma.upgradeApplication.findMany({
      where: { userId: session.id },
      orderBy: { submittedAt: "desc" },
    });
    return ok({ applications });
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/upgrade-applications — Submit for Upgrade (spec §18). Server re-validates
// eligibility (never trust the client's enabled/disabled button state) and freezes a snapshot
// of exactly which approved records/evidence were relied upon, so later work can't silently
// alter an already-submitted application.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const existingPending = await prisma.upgradeApplication.findFirst({
      where: { userId: session.id, status: "PENDING" },
    });
    if (existingPending) return badRequest("An upgrade application is already pending.");

    const progress = await computeProgress(session.id);
    if (!progress.eligibleForUpgrade || !progress.currentGrade || !progress.nextGrade) {
      return badRequest("Not all requirements are met yet.");
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, include: { currentGrade: true } });
    const openPeriod = await prisma.gradeHistory.findFirstOrThrow({
      where: { userId: session.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    const nextGrade = await prisma.grade.findUniqueOrThrow({
      where: { key: nextGradeKey(user.currentGrade!.key as GradeKey) as GradeKey },
    });

    const contributingRecords = await prisma.workRecord.findMany({
      where: { gradeHistoryId: openPeriod.id, performerId: session.id, status: "APPROVED" },
      include: { workDates: true, identifiables: true },
    });

    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.upgradeApplication.create({
        data: {
          userId: session.id,
          fromGradeId: user.currentGradeId!,
          toGradeId: nextGrade.id,
          status: "PENDING",
        },
      });

      for (const record of contributingRecords) {
        await tx.upgradeApplicationEvidence.create({
          data: {
            upgradeApplicationId: app.id,
            workRecordId: record.id,
            approvedDaysSnapshot: record.workDates.filter((d) => d.status === "CLAIMED").length,
            approvedIdentifiablesSnapshot: record.identifiables.filter((i) => i.status === "APPROVED").length,
          },
        });
      }

      return app;
    });

    return ok({ id: application.id }, 201);
  } catch (err) {
    return serverError(err);
  }
}
