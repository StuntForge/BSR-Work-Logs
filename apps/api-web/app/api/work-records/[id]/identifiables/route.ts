import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// Category + brief description only — no date field, deliberately (spec §8). selfCoordinated is
// Key Stunt Performer only — the performer's own claim, used later for the Key -> Full Member
// points system's "Self-Coordinating" category (only counts if the reviewing FM leaves it checked).
const schema = z.object({ categoryId: z.string().min(1), performerDescription: z.string().min(1), selfCoordinated: z.boolean().optional() });

// POST /api/work-records/:id/identifiables — adding claims is the performer's responsibility (spec §8, §33).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({
      where: { id: params.id },
      include: { performer: { include: { currentGrade: true } } },
    });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records accept new identifiables.");

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Category and a brief description are required.");

    const category = await prisma.areaCategory.findUnique({ where: { id: body.data.categoryId } });
    if (!category || !category.active) return badRequest("Invalid category.");

    const selfCoordinated = !!body.data.selfCoordinated && record.performer.currentGrade?.key === "KEY_STUNT_PERFORMER";

    const identifiable = await prisma.identifiable.create({
      data: {
        workRecordId: record.id,
        categoryId: body.data.categoryId,
        performerDescription: body.data.performerDescription,
        status: "SUBMITTED",
        selfCoordinated,
      },
    });

    return ok({ id: identifiable.id }, 201);
  } catch (err) {
    return serverError(err);
  }
}
