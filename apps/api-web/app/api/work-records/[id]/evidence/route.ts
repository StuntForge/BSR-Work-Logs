import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateEvidenceFile, uploadEvidence } from "@/lib/blob";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// POST /api/work-records/:id/evidence — contract/evidence upload is part of the normal
// workflow, not deferred to the final upgrade application (spec §9).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records accept new evidence.");

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return badRequest("No file provided.");

    const validationError = validateEvidenceFile(file.type, file.size);
    if (validationError) return badRequest(validationError);

    const url = await uploadEvidence(record.id, file.name, file);

    const doc = await prisma.evidenceDocument.create({
      data: {
        workRecordId: record.id,
        fileUrl: url,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    return ok({ id: doc.id, fileUrl: doc.fileUrl, fileName: doc.fileName }, 201);
  } catch (err) {
    return serverError(err);
  }
}
