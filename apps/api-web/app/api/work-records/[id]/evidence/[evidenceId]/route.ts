import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fetchEvidence } from "@/lib/blob";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// GET — stream a private evidence file back to an authenticated viewer (performer, the
// assigned Full Member, or committee) — same view rule as GET /api/work-records/:id.
export async function GET(req: NextRequest, { params: __params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id && record.fullMemberId !== session.id && !session.isCommittee) return forbidden();

    const doc = await prisma.evidenceDocument.findUnique({ where: { id: params.evidenceId } });
    if (!doc || doc.workRecordId !== record.id) return notFound();

    const result = await fetchEvidence(doc.fileUrl);
    if (result?.statusCode !== 200) return notFound("File not found in storage.");

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${doc.fileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

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
    await del(doc.fileUrl).catch(() => {}); // best-effort — don't fail the request if the blob is already gone
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
