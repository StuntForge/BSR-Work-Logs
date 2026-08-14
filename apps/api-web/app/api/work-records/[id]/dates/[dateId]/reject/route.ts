import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// POST /api/work-records/:id/dates/:dateId/reject — Full Member rejects one wrongly-claimed
// date. FMs never approve dates one by one, only reject the odd wrong one (spec §15.1).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string; dateId: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.fullMemberId !== session.id) return forbidden();
    if (record.status !== "SUBMITTED") return forbidden("Only Submitted records are under review.");

    const date = await prisma.workDate.findUnique({ where: { id: params.dateId } });
    if (!date || date.workRecordId !== record.id) return notFound();

    await prisma.workDate.update({ where: { id: params.dateId }, data: { status: "REJECTED", rejectedAt: new Date() } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
