import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, unauthorized, forbidden, serverError } from "@/lib/http";

const VALID_CATEGORIES = ["UPGRADE_QUERIES", "BUG_REPORTS", "OTHER"];

// GET /api/committee/support-tickets?status=OPEN|CLOSED&category=UPGRADE_QUERIES,OTHER
// Backs both the Support Tickets page (category=UPGRADE_QUERIES,OTHER — Bug Reports live on
// their own Known Issues page only) and the Known Issues page (category=BUG_REPORTS, with
// Open/Closed relabelled as Open/Fixed on the client). `category` accepts a comma-separated list.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const status = req.nextUrl.searchParams.get("status");
    const categories = (req.nextUrl.searchParams.get("category") ?? "").split(",").filter((c) => VALID_CATEGORIES.includes(c));

    const tickets = await prisma.supportTicket.findMany({
      where: {
        status: status === "OPEN" || status === "CLOSED" ? status : undefined,
        category: categories.length > 0 ? { in: categories as any } : undefined,
      },
      include: { user: { select: { id: true, name: true, currentGrade: { select: { label: true } } } } },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      tickets: tickets.map((t) => ({
        id: t.id,
        category: t.category,
        title: t.title,
        status: t.status,
        createdAt: t.createdAt,
        member: { id: t.user.id, name: t.user.name, grade: t.user.currentGrade?.label ?? null },
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
