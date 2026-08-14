import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/http";

const schema = z.object({ label: z.string().min(1), order: z.number().int() });

// POST /api/committee/area-categories/:id/items
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Label and order are required.");

    const item = await prisma.areaItem.create({ data: { categoryId: params.id, label: body.data.label, order: body.data.order } });
    return ok({ id: item.id }, 201);
  } catch (err) {
    return serverError(err);
  }
}
