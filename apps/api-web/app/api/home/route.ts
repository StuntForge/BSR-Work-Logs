import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { computeProgress, computeLifetimeStats } from "@/lib/progress";
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

    // Full Members have no nextGrade — their Home screen shows lifetime totals instead of
    // per-grade-period requirement progress, which would otherwise always be empty for them.
    const lifetime = progress.nextGrade === null ? await computeLifetimeStats(session.id) : null;

    return ok({
      name: user.name,
      currentGrade: progress.currentGrade,
      nextGrade: progress.nextGrade,
      gradePeriodStartedAt: progress.gradePeriodStartedAt,
      requirements: progress.requirements,
      eligibleForUpgrade: progress.eligibleForUpgrade,
      lifetimeApprovedDays: lifetime?.lifetimeApprovedDays ?? null,
      lifetimeApprovedIdentifiables: lifetime?.lifetimeApprovedIdentifiables ?? null,
    });
  } catch (err) {
    return serverError(err);
  }
}
