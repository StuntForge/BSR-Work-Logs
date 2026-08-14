import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({
  action: z.enum(["approve", "edit", "reject"]),
  verifiedDescription: z.string().min(1).optional(),
});

// PATCH /api/work-records/:id/identifiables/:identifiableId/decision — Full Member
// Approve/Edit/Reject on one identifiable (spec §8, §15.2). The FM can correct wording and
// approve the corrected version, but can never create a new identifiable.
export async function PATCH(req: NextRequest, { params: __params }: { params: Promise<{ id: string; identifiableId: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.fullMemberId !== session.id) return forbidden();
    if (record.status !== "SUBMITTED") return forbidden("Only Submitted records are under review.");

    const identifiable = await prisma.identifiable.findUnique({ where: { id: params.identifiableId } });
    if (!identifiable || identifiable.workRecordId !== record.id) return notFound();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Invalid decision.");

    if (body.data.action === "reject") {
      await prisma.identifiable.update({
        where: { id: params.identifiableId },
        data: { status: "REJECTED", reviewedAt: new Date() },
      });
    } else {
      // "approve" and "edit" both finalize as APPROVED — original wording is preserved in
      // performerDescription, the FM's (possibly corrected) wording goes in verifiedDescription.
      await prisma.identifiable.update({
        where: { id: params.identifiableId },
        data: {
          status: "APPROVED",
          verifiedDescription: body.data.verifiedDescription ?? identifiable.performerDescription,
          reviewedAt: new Date(),
        },
      });
    }

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
