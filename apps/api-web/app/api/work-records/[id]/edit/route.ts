import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// POST /api/work-records/:id/edit — the performer's deliberate "Edit" action on a Rejected
// record. Only at this exact point does it become Ongoing again (spec §4.1).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "REJECTED") return forbidden("Only Rejected records can be re-opened for editing.");

    await prisma.workRecord.update({ where: { id: record.id }, data: { status: "ONGOING" } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
