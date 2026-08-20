import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { sendPush } from "@/lib/push";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  message: z.string().optional(),
});

// POST /api/work-records/:id/decision — Full Member completes Approve/Reject (spec §15.3).
// Approval message is optional; rejection reason is mandatory. Completing the decision closes
// the review and removes it from the outstanding inbox (it simply stops matching the
// status=SUBMITTED filter used by GET /api/work-approvals).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.fullMemberId !== session.id) return forbidden();
    if (record.status !== "SUBMITTED") return forbidden("This record is not awaiting review.");

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Invalid decision.");
    if (body.data.decision === "REJECTED" && !body.data.message?.trim()) {
      return badRequest("A reason is required when rejecting.");
    }

    if (body.data.decision === "APPROVED") {
      // Every identifiable must be explicitly decided first — no implicit accept-on-approve
      // default anymore (explicit BSR policy: the FM must respond to each one).
      const unresolvedCount = await prisma.identifiable.count({ where: { workRecordId: record.id, status: "SUBMITTED" } });
      if (unresolvedCount > 0) {
        return badRequest("Respond to every identifiable before approving this work record.");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.workRecord.update({
        where: { id: record.id },
        data: { status: body.data.decision, decidedAt: new Date() },
      });

      await tx.workApproval.create({
        data: {
          workRecordId: record.id,
          decidedById: session.id,
          decision: body.data.decision,
          message: body.data.message,
        },
      });
    });

    await writeAudit({
      actorId: session.id,
      action: `WORK_RECORD_${body.data.decision}`,
      entityType: "WorkRecord",
      entityId: record.id,
      before: { status: "SUBMITTED" },
      after: { status: body.data.decision, message: body.data.message },
    });

    await notify({
      userId: record.performerId,
      type: "WORK_APPROVAL_DECISION",
      title: body.data.decision === "APPROVED" ? "Work record approved" : "Work record rejected",
      body: body.data.message || (body.data.decision === "APPROVED" ? "Your submission was approved." : "Your submission was rejected."),
      relatedEntityType: "WorkRecord",
      relatedEntityId: record.id,
    });

    // Push is deliberately narrower than the in-app notification: only approvals push (never
    // rejections), and this route only ever handles Full Member-reviewed records — Solo/
    // Self-Coordinated submissions are auto-approved through a separate endpoint and never reach
    // here, so there's no need to filter isSoloSubmission out explicitly.
    if (body.data.decision === "APPROVED") {
      await sendPush(record.performerId, "Work record approved", "A Full Member has approved your work record.");
    }

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
