import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// DELETE — performer removes an uploaded evidence file while the record is still Ongoing.
export async function DELETE(req: NextRequest, { params: __params }: { params: Promise<{ id: string; evidenceId: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records are editable.");

    const doc = await prisma.evidenceDocument.findUnique({ where: { id: params.evidenceId } });
    if (!doc || doc.workRecordId !== record.id) return notFound();

    await prisma.evidenceDocument.delete({ where: { id: params.evidenceId } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
