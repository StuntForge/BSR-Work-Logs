import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const patchSchema = z.object({ hiddenFromUser: z.literal(true) });

// PATCH /api/support-tickets/:id — the only mutation a member can make to their own ticket:
// hide a resolved (CLOSED) one from their list. This never touches the committee's copy or the
// audit trail — it's purely a per-user visibility flag (spec: "swipe to delete from the list").
export async function PATCH(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
    if (!ticket) return notFound();
    if (ticket.userId !== session.id) return forbidden();
    if (ticket.status !== "CLOSED") return forbidden("Only closed tickets can be removed from your list.");

    const body = patchSchema.safeParse(await req.json());
    if (!body.success) return badRequest("Invalid request.");

    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { hiddenFromUser: true } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
