import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({ fullMemberId: z.string().min(1) });

// POST /api/work-records/:id/submit — Submit for Approval. The Full Member must be a valid,
// active Full Member account; free text or an arbitrary id is rejected (spec §10).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records can be submitted.");

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Select a Full Member to submit to.");

    const fullMember = await prisma.user.findUnique({
      where: { id: body.data.fullMemberId },
      include: { currentGrade: true },
    });
    if (!fullMember || !fullMember.active || fullMember.currentGrade?.key !== "FULL_MEMBER") {
      return badRequest("Selected Full Member is not a valid active account.");
    }

    await prisma.workRecord.update({
      where: { id: record.id },
      data: { status: "SUBMITTED", fullMemberId: fullMember.id, submittedAt: new Date() },
    });

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
