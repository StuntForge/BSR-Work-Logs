import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// POST /api/work-records/:id/continue — "Add Additional Work" (spec §16). An approved work
// record is never unlocked/mutated; this creates a new record in the same ProductionFamily
// instead. Duplicates reusable details, never dates or identifiables. Locks the source record
// against spawning a second continuation. The Cont N label is rendered from
// (productionFamily.rootName, continuationSequence) — never by parsing a prior display string
// (spec §33).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const source = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!source) return notFound();
    if (source.performerId !== session.id) return forbidden();
    if (source.status !== "APPROVED" && source.status !== "ARCHIVED") return forbidden("Only an Approved or Archived record can start a continuation.");
    if (source.hasSpawnedContinuation) return forbidden("A continuation has already been started from this record.");

    const openPeriod = await prisma.gradeHistory.findFirst({
      where: { userId: session.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (!openPeriod) return forbidden("No active grade period for this account.");

    const created = await prisma.$transaction(async (tx) => {
      const record = await tx.workRecord.create({
        data: {
          productionFamilyId: source.productionFamilyId,
          performerId: source.performerId,
          gradeHistoryId: openPeriod.id,
          continuationSequence: source.continuationSequence + 1,
          status: "ONGOING",
          natureOfEmployment: source.natureOfEmployment,
          areaItemId: source.areaItemId,
          jobDescription: source.jobDescription,
          otherPerformersText: source.otherPerformersText,
          locations: source.locations,
          riskAssessment: source.riskAssessment,
          comments: source.comments,
        },
      });
      await tx.workRecord.update({ where: { id: source.id }, data: { hasSpawnedContinuation: true } });
      return record;
    });

    return ok({ id: created.id }, 201);
  } catch (err) {
    return serverError(err);
  }
}
