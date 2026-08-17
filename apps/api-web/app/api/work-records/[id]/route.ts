import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { effectiveGradeStart, isQualifyingCoreJob } from "@/lib/eligibility";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

async function loadRecordWithDetail(id: string) {
  return prisma.workRecord.findUnique({
    where: { id },
    include: {
      productionFamily: true,
      performer: { select: { id: true, name: true, lastUpgradedAt: true, dateJoined: true } },
      fullMember: { select: { id: true, name: true } },
      areaItem: { include: { category: true } },
      workDates: { orderBy: { date: "asc" } },
      identifiables: { include: { category: true }, orderBy: { createdAt: "asc" } },
      evidenceDocuments: true,
      workApprovals: { orderBy: { decidedAt: "desc" } },
      otherPerformerLinks: true,
      gradeHistory: true,
    },
  });
}

function canView(session: { id: string; isCommittee: boolean }, record: NonNullable<Awaited<ReturnType<typeof loadRecordWithDetail>>>) {
  return record.performerId === session.id || record.fullMemberId === session.id || session.isCommittee;
}

// GET /api/work-records/:id
export async function GET(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await loadRecordWithDetail(params.id);
    if (!record) return notFound();
    if (!canView(session, record)) return forbidden();

    const label =
      record.continuationSequence > 0
        ? `Cont ${record.continuationSequence}: ${record.productionFamily.rootName}`
        : record.productionFamily.rootName;

    // Earliest date the performer is allowed to claim on this record's calendar — lets the
    // client disable/block those dates directly instead of only rejecting them after a tap.
    const eligibleFromDate = effectiveGradeStart(record.performer, record.gradeHistory.startedAt);

    // Dates already claimed on an earlier record in this same continuation chain — a
    // "Duplicate Production" shouldn't let the performer re-claim the same day twice.
    const previousDates =
      record.continuationSequence > 0
        ? (
            await prisma.workDate.findMany({
              where: {
                status: "CLAIMED",
                workRecord: { productionFamilyId: record.productionFamilyId, continuationSequence: { lt: record.continuationSequence } },
              },
              select: { date: true },
            })
          ).map((d) => d.date.toISOString().slice(0, 10))
        : [];

    return ok({
      record: {
        id: record.id,
        productionName: label,
        productionFamilyId: record.productionFamilyId,
        continuationSequence: record.continuationSequence,
        hasSpawnedContinuation: record.hasSpawnedContinuation,
        status: record.status,
        performer: { id: record.performer.id, name: record.performer.name },
        fullMember: record.fullMember,
        eligibleFromDate: eligibleFromDate.toISOString(),
        previousDates,
        natureOfEmployment: record.natureOfEmployment,
        areaItem: record.areaItem ? { id: record.areaItem.id, label: record.areaItem.label, category: record.areaItem.category.label } : null,
        jobDescription: record.jobDescription,
        otherPerformersText: record.otherPerformersText,
        locations: record.locations,
        riskAssessment: record.riskAssessment,
        comments: record.comments,
        isCoreJob: record.isCoreJob,
        coreJobStartDate: record.coreJobStartDate,
        coreJobEndDate: record.coreJobEndDate,
        isQualifyingCoreJob: isQualifyingCoreJob(record.coreJobStartDate, record.coreJobEndDate),
        isSoloSubmission: record.isSoloSubmission,
        workDates: record.workDates.map((d) => ({ id: d.id, date: d.date, status: d.status })),
        approvedDays: record.workDates.filter((d) => d.status === "CLAIMED").length,
        identifiables: record.identifiables.map((i) => ({
          id: i.id,
          category: { id: i.category.id, label: i.category.label },
          performerDescription: i.performerDescription,
          verifiedDescription: i.verifiedDescription,
          status: i.status,
        })),
        evidenceDocuments: record.evidenceDocuments,
        latestDecision: record.workApprovals[0] ?? null,
        submittedAt: record.submittedAt,
        decidedAt: record.decidedAt,
        createdAt: record.createdAt,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

const patchSchema = z.object({
  jobDescription: z.string().optional(),
  locations: z.array(z.enum(["STUDIO", "UK", "OVERSEAS"])).optional(),
  riskAssessment: z.boolean().optional(),
  comments: z.string().optional(),
  isCoreJob: z.boolean().optional(),
  coreJobStartDate: z.string().nullable().optional(),
  coreJobEndDate: z.string().nullable().optional(),
});

// PATCH /api/work-records/:id — edit ongoing production fields (spec §4.1: Ongoing records are editable)
export async function PATCH(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records are editable.");

    const body = patchSchema.safeParse(await req.json());
    if (!body.success) {
      const details = body.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
      return badRequest(`Invalid fields — ${details}`);
    }

    const { coreJobStartDate, coreJobEndDate, ...rest } = body.data;
    const startDate: Date | null | undefined = coreJobStartDate ? new Date(coreJobStartDate) : (coreJobStartDate as null | undefined);
    const endDate: Date | null | undefined = coreJobEndDate ? new Date(coreJobEndDate) : (coreJobEndDate as null | undefined);
    if (startDate && endDate && startDate.getTime() >= endDate.getTime()) {
      return badRequest("Core job start date must be before the end date.");
    }

    await prisma.workRecord.update({ where: { id: params.id }, data: { ...rest, coreJobStartDate: startDate, coreJobEndDate: endDate } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/work-records/:id — permanently remove an Ongoing production the performer no
// longer wants. Restricted to ONGOING (same as edit) so nothing that's ever been through
// Full Member or committee review can be deleted, preserving the audit trail spec §27 requires.
export async function DELETE(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records can be deleted.");

    await prisma.$transaction([
      prisma.workDate.deleteMany({ where: { workRecordId: record.id } }),
      prisma.identifiable.deleteMany({ where: { workRecordId: record.id } }),
      prisma.evidenceDocument.deleteMany({ where: { workRecordId: record.id } }),
      prisma.workRecordPerformerLink.deleteMany({ where: { workRecordId: record.id } }),
      prisma.workRecord.delete({ where: { id: record.id } }),
    ]);

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
