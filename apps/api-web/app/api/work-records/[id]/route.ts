import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

async function loadRecordWithDetail(id: string) {
  return prisma.workRecord.findUnique({
    where: { id },
    include: {
      productionFamily: true,
      performer: { select: { id: true, name: true } },
      fullMember: { select: { id: true, name: true } },
      areaItem: { include: { category: true } },
      workDates: { orderBy: { date: "asc" } },
      identifiables: { include: { category: true }, orderBy: { createdAt: "asc" } },
      evidenceDocuments: true,
      workApprovals: { orderBy: { decidedAt: "desc" } },
      otherPerformerLinks: true,
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

    return ok({
      record: {
        id: record.id,
        productionName: label,
        productionFamilyId: record.productionFamilyId,
        continuationSequence: record.continuationSequence,
        hasSpawnedContinuation: record.hasSpawnedContinuation,
        status: record.status,
        performer: record.performer,
        fullMember: record.fullMember,
        natureOfEmployment: record.natureOfEmployment,
        areaItem: record.areaItem ? { id: record.areaItem.id, label: record.areaItem.label, category: record.areaItem.category.label } : null,
        jobDescription: record.jobDescription,
        otherPerformersText: record.otherPerformersText,
        location: record.location,
        riskAssessment: record.riskAssessment,
        comments: record.comments,
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
  location: z.enum(["STUDIO", "UK", "OVERSEAS"]).optional(),
  riskAssessment: z.boolean().optional(),
  comments: z.string().optional(),
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
    if (!body.success) return badRequest("Invalid fields.");

    await prisma.workRecord.update({ where: { id: params.id }, data: body.data });
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
