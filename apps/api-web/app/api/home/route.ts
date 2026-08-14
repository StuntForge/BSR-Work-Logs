import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { computeProgress } from "@/lib/progress";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, serverError } from "@/lib/http";

// GET /api/home — the Home screen's data (spec §3). Time Served is returned as a fixed
// starting timestamp; the client ticks the live clock itself from that.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const progress = await computeProgress(session.id);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });

    return ok({
      name: user.name,
      currentGrade: progress.currentGrade,
      nextGrade: progress.nextGrade,
      gradePeriodStartedAt: progress.gradePeriodStartedAt,
      requirements: progress.requirements,
      eligibleForUpgrade: progress.eligibleForUpgrade,
    });
  } catch (err) {
    return serverError(err);
  }
}
