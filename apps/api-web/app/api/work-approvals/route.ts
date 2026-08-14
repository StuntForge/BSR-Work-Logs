import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/http";

// GET /api/work-approvals — the Full Member's outstanding inbox (spec §14). Deliberately
// simple: performer name, production, days total, identifiables total only. The badge count
// on the Work Approvals menu item is just this list's length.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();
    if (!session.isFullMember) return ok({ pending: [] });

    const records = await prisma.workRecord.findMany({
      where: { fullMemberId: session.id, status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: {
        productionFamily: true,
        performer: { select: { id: true, name: true } },
        workDates: true,
        identifiables: true,
      },
    });

    return ok({
      pending: records.map((r) => ({
        id: r.id,
        performerName: r.performer.name,
        productionName: r.continuationSequence > 0 ? `Cont ${r.continuationSequence}: ${r.productionFamily.rootName}` : r.productionFamily.rootName,
        days: r.workDates.filter((d) => d.status === "CLAIMED").length,
        identifiables: r.identifiables.length,
        submittedAt: r.submittedAt,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
