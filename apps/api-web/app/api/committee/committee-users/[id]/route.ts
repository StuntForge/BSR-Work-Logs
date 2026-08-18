import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdminSession } from "@/lib/committee";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({ active: z.boolean() });

// PATCH /api/committee/committee-users/:id — activate/deactivate a committee login. Admin-only.
export async function PATCH(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!isAdminSession(session)) return session ? forbidden() : unauthorized();

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user || !user.isCommittee || user.isAdmin) return notFound();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Invalid request.");

    await prisma.user.update({ where: { id: params.id }, data: { active: body.data.active } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
