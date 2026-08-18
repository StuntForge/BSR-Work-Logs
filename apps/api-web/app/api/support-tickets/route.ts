import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";

const createSchema = z.object({
  category: z.enum(["UPGRADE_QUERIES", "BUG_REPORTS", "OTHER"]),
  title: z.string().min(1),
  message: z.string().min(1),
});

// GET /api/support-tickets — the member's own ticket history, newest first. Full details are
// returned here (not just a summary) since the list is small per-user and the mobile app expands
// a tapped row from this same data rather than making a second request.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.id, hiddenFromUser: false },
      orderBy: { createdAt: "desc" },
    });

    return ok({ tickets });
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/support-tickets — member opens a new ticket. Also visible immediately to the
// committee on the web portal's Support Tickets (and, for Bug Reports, Known Issues) pages.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const body = createSchema.safeParse(await req.json());
    if (!body.success) return badRequest("Category, title and message are all required.");

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.id,
        category: body.data.category,
        title: body.data.title,
        message: body.data.message,
      },
    });

    return ok({ id: ticket.id }, 201);
  } catch (err) {
    return serverError(err);
  }
}
