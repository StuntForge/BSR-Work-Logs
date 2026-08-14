import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// Category + brief description only — no date field, deliberately (spec §8).
const schema = z.object({ categoryId: z.string().min(1), performerDescription: z.string().min(1) });

// POST /api/work-records/:id/identifiables — adding claims is the performer's responsibility (spec §8, §33).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records accept new identifiables.");

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Category and a brief description are required.");

    const category = await prisma.areaCategory.findUnique({ where: { id: body.data.categoryId } });
    if (!category || !category.active) return badRequest("Invalid category.");

    const identifiable = await prisma.identifiable.create({
      data: {
        workRecordId: record.id,
        categoryId: body.data.categoryId,
        performerDescription: body.data.performerDescription,
        status: "SUBMITTED",
      },
    });

    return ok({ id: identifiable.id }, 201);
  } catch (err) {
    return serverError(err);
  }
}
