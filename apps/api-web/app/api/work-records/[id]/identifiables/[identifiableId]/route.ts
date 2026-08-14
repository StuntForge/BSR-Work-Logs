import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({ performerDescription: z.string().min(1) });

// PATCH — performer corrects their own wording while the record is still Ongoing.
export async function PATCH(req: NextRequest, { params: __params }: { params: Promise<{ id: string; identifiableId: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records are editable.");

    const identifiable = await prisma.identifiable.findUnique({ where: { id: params.identifiableId } });
    if (!identifiable || identifiable.workRecordId !== record.id) return notFound();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("A description is required.");

    await prisma.identifiable.update({ where: { id: params.identifiableId }, data: { performerDescription: body.data.performerDescription } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}

// DELETE — performer removes their own claim while Ongoing.
export async function DELETE(req: NextRequest, { params: __params }: { params: Promise<{ id: string; identifiableId: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records are editable.");

    const identifiable = await prisma.identifiable.findUnique({ where: { id: params.identifiableId } });
    if (!identifiable || identifiable.workRecordId !== record.id) return notFound();

    await prisma.identifiable.delete({ where: { id: params.identifiableId } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
