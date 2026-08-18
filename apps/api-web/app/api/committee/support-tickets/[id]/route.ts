import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// GET /api/committee/support-tickets/:id — full ticket detail for the review/respond page.
export async function GET(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, currentGrade: { select: { label: true } } } },
        respondedBy: { select: { id: true, name: true } },
      },
    });
    if (!ticket) return notFound();

    const canRespond = ticket.category !== "BUG_REPORTS" || session.isAdmin;

    return ok({
      ticket: {
        id: ticket.id,
        category: ticket.category,
        title: ticket.title,
        message: ticket.message,
        status: ticket.status,
        response: ticket.response,
        respondedAt: ticket.respondedAt,
        respondedBy: ticket.respondedBy,
        createdAt: ticket.createdAt,
        canRespond,
        member: { id: ticket.user.id, name: ticket.user.name, email: ticket.user.email, grade: ticket.user.currentGrade?.label ?? null },
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
