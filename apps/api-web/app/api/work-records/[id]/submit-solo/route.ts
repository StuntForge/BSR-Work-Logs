import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// POST /api/work-records/:id/submit-solo — Solo/Self-Coordinated submission. Only available to
// Senior or Key Stunt Performers. Skips Full Member review entirely: the performer is asserting
// every date listed was self-coordinated and is well evidenced, so it goes straight to APPROVED
// with a self-authored WorkApproval row for the audit trail, and lands in the committee's
// separate Solo Submissions section rather than the normal review queue.
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const performer = await prisma.user.findUnique({ where: { id: session.id }, include: { currentGrade: true } });
    if (!performer || !["SENIOR_STUNT_PERFORMER", "KEY_STUNT_PERFORMER"].includes(performer.currentGrade?.key ?? "")) {
      return forbidden("Solo/Self-Coordinated submissions are only available to Senior or Key Stunt Performers.");
    }

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records can be submitted.");

    const claimedDays = await prisma.workDate.count({ where: { workRecordId: record.id, status: "CLAIMED" } });
    if (claimedDays === 0) return badRequest("Add at least one work date before submitting.");
    if (!record.jobDescription?.trim()) return badRequest("Add a job description before submitting.");
    if (!record.locations || record.locations.length === 0) return badRequest("Select at least one location before submitting.");
    const evidenceCount = await prisma.evidenceDocument.count({ where: { workRecordId: record.id } });
    if (evidenceCount === 0) return badRequest("Upload at least one file before submitting.");

    const decidedAt = new Date();

    await prisma.$transaction([
      prisma.workRecord.update({
        where: { id: record.id },
        data: { status: "APPROVED", isSoloSubmission: true, fullMemberId: null, submittedAt: decidedAt, decidedAt },
      }),
      prisma.workApproval.create({
        data: {
          workRecordId: record.id,
          decidedById: session.id,
          decision: "APPROVED",
          message: "Solo/Self-Coordinated submission — instantly approved on submission.",
          decidedAt,
        },
      }),
    ]);

    await writeAudit({
      actorId: session.id,
      action: "WORK_RECORD_SOLO_APPROVED",
      entityType: "WorkRecord",
      entityId: record.id,
      before: { status: "ONGOING" },
      after: { status: "APPROVED", isSoloSubmission: true },
    });

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
