import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, unauthorized, forbidden, serverError } from "@/lib/http";

// GET /api/committee/solo-submissions — instantly-approved Solo/Self-Coordinated work records,
// kept separate from the normal Pending Upgrades queue since there's nothing to approve here —
// this is an audit/oversight list, not a decision queue.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const records = await prisma.workRecord.findMany({
      where: { isSoloSubmission: true },
      include: {
        productionFamily: true,
        performer: { select: { id: true, name: true, email: true } },
        workDates: { where: { status: "CLAIMED" } },
        evidenceDocuments: true,
      },
      orderBy: { decidedAt: "desc" },
    });

    return ok({
      submissions: records.map((r) => ({
        id: r.id,
        productionName: r.continuationSequence > 0 ? `Cont ${r.continuationSequence}: ${r.productionFamily.rootName}` : r.productionFamily.rootName,
        performer: r.performer,
        days: r.workDates.length,
        evidenceCount: r.evidenceDocuments.length,
        decidedAt: r.decidedAt,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
