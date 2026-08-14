import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// DELETE /api/work-records/:id/dates/:dateId — performer un-claims a date while still Ongoing.
export async function DELETE(req: NextRequest, { params: __params }: { params: Promise<{ id: string; dateId: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records are editable.");

    const date = await prisma.workDate.findUnique({ where: { id: params.dateId } });
    if (!date || date.workRecordId !== record.id) return notFound();

    await prisma.workDate.delete({ where: { id: params.dateId } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
