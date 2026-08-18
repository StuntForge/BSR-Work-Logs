import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { notify } from "@/lib/notifications";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({ message: z.string().min(1) });

// POST /api/committee/support-tickets/:id/respond — the committee's reply closes the ticket
// (moves it from Open to Closed/Fixed) and notifies the member in-app. There's no re-opening —
// a member who still needs help after this simply opens a new ticket.
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
    if (!ticket) return notFound();
    if (ticket.status !== "OPEN") return forbidden("This ticket has already been responded to.");
    if (ticket.category === "BUG_REPORTS" && !session.isAdmin) return forbidden("Only the Administrator can respond to Bug Reports.");

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("A response message is required.");

    const respondedAt = new Date();
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { response: body.data.message, status: "CLOSED", respondedAt, respondedById: session.id },
    });

    await notify({
      userId: ticket.userId,
      type: "SUPPORT_TICKET_RESPONSE",
      title: "The office responded to your support ticket",
      body: body.data.message,
      relatedEntityType: "SupportTicket",
      relatedEntityId: ticket.id,
    });

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
