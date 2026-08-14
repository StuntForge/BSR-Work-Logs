import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/http";

const schema = z.object({ label: z.string().min(1).optional(), order: z.number().int().optional(), active: z.boolean().optional() });

// PATCH /api/committee/area-items/:id — edit/reorder/deactivate. Historic records keep the
// values that applied when recorded regardless of later edits here (spec §7).
export async function PATCH(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Invalid fields.");

    await prisma.areaItem.update({ where: { id: params.id }, data: body.data });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
