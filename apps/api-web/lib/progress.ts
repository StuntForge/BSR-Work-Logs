import { prisma } from "./prisma";
import { nextGradeKey, type GradeKey } from "@bsr/shared";
import { effectiveGradeStart, isQualifyingCoreJob } from "./eligibility";

export interface RequirementProgress {
  type: string;
  targetValue: number;
  approvedValue: number;
  pendingValue: number;
  met: boolean;
  // Human-readable extra context for requirement types too composite to fit the plain
  // approvedValue/targetValue ratio (currently just SOLO_OR_CORE_TEAM).
  detail?: string;
  // Structured per-category breakdown for the Key -> Full Member points system — the mobile UI
  // renders individual category rows/mini-bars from this rather than parsing `detail`.
  pointsBreakdown?: PointsBreakdown;
}

export interface PointsBreakdown {
  soloDays: number;
  soloPoints: number;
  unitCoordinatorDays: number;
  unitCoordinatorPoints: number;
  selfCoordinatingCount: number;
  selfCoordinatingPoints: number;
  assistantCoordinatorDays: number;
  assistantCoordinatorPoints: number;
  groupABPoints: number;
  groupCDPoints: number;
  groupCDCounted: number;
}


export interface ProgressResult {
  currentGrade: { key: string; label: string } | null;
  nextGrade: { key: string; label: string } | null;
  gradePeriodStartedAt: string | null;
  requirements: RequirementProgress[];
  eligibleForUpgrade: boolean;
}

export interface LifetimeStats {
  lifetimeApprovedDays: number;
  lifetimeApprovedIdentifiables: number;
}

// Full Members have no next grade, so the normal per-grade-period requirements list is always
// empty for them — the Home screen instead shows a running lifetime total across every grade
// period they've ever had, approved or since archived (status APPROVED or ARCHIVED both mean
// "was approved at some point"; REJECTED/ONGOING/SUBMITTED never counted).
export async function computeLifetimeStats(userId: string): Promise<LifetimeStats> {
  const [lifetimeApprovedDays, lifetimeApprovedIdentifiables] = await Promise.all([
    prisma.workDate.count({
      where: { status: "CLAIMED", workRecord: { performerId: userId, status: { in: ["APPROVED", "ARCHIVED"] } } },
    }),
    prisma.identifiable.count({
      where: { status: "APPROVED", workRecord: { performerId: userId } },
    }),
  ]);
  return { lifetimeApprovedDays, lifetimeApprovedIdentifiables };
}

// Requirement calculations are reproducible from underlying verified records — computed on
// every read, never a stored counter (spec §17).
export async function computeProgress(userId: string): Promise<ProgressResult> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { currentGrade: true },
  });

  if (!user.currentGrade) {
    return { currentGrade: null, nextGrade: null, gradePeriodStartedAt: null, requirements: [], eligibleForUpgrade: false };
  }

  const openPeriod = await prisma.gradeHistory.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  const nextKey = nextGradeKey(user.currentGrade.key as GradeKey);
  if (!nextKey || !openPeriod) {
    return {
      currentGrade: { key: user.currentGrade.key, label: user.currentGrade.label },
      nextGrade: null,
      gradePeriodStartedAt: openPeriod?.startedAt.toISOString() ?? null,
      requirements: [],
      eligibleForUpgrade: false,
    };
  }

  const nextGrade = await prisma.grade.findUniqueOrThrow({ where: { key: nextKey } });
  const defs = await prisma.requirementDefinition.findMany({
    where: { targetGradeId: nextGrade.id, active: true },
    orderBy: { type: "asc" },
  });

  const gradeStart = effectiveGradeStart(user, openPeriod.startedAt);

  const requirements: RequirementProgress[] = [];

  for (const def of defs) {
    if (def.type === "DAYS_WORKED") {
      const approvedValue = await prisma.workDate.count({
        where: {
          status: "CLAIMED",
          workRecord: { gradeHistoryId: openPeriod.id, performerId: userId, status: "APPROVED" },
        },
      });
      const pendingValue = await prisma.workDate.count({
        where: {
          status: "CLAIMED",
          workRecord: { gradeHistoryId: openPeriod.id, performerId: userId, status: "SUBMITTED" },
        },
      });
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue, pendingValue, met: approvedValue >= def.targetValue });
    } else if (def.type === "IDENTIFIABLES") {
      const approvedValue = await prisma.identifiable.count({
        where: {
          status: "APPROVED",
          workRecord: { gradeHistoryId: openPeriod.id, performerId: userId },
        },
      });
      const pendingValue = await prisma.identifiable.count({
        where: {
          status: "SUBMITTED",
          workRecord: { gradeHistoryId: openPeriod.id, performerId: userId, status: "SUBMITTED" },
        },
      });
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue, pendingValue, met: approvedValue >= def.targetValue });
    } else if (def.type === "MIN_TIME_AT_GRADE") {
      const daysServed = Math.floor((Date.now() - gradeStart.getTime()) / (1000 * 60 * 60 * 24));
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue: daysServed, pendingValue: 0, met: daysServed >= def.targetValue });
    } else if (def.type === "HEALTH_SAFETY") {
      // Level is set by the committee, not the member (spec §25 workflow TBD; explicit policy:
      // required level rises with grade). Met when their current level is at least what's required.
      // orderBy makes this deterministic even if a duplicate Qualification row ever exists for
      // the same user+type — always trust whichever was set most recently.
      const qualification = await prisma.qualification.findFirst({ where: { userId, type: "HEALTH_SAFETY" }, orderBy: { updatedAt: "desc" } });
      const level = qualification?.level ?? 0;
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue: level, pendingValue: 0, met: level >= def.targetValue });
    } else if (def.type === "SOLO_OR_CORE_TEAM") {
      // Senior -> Key composite (explicit BSR policy): met by ANY of —
      //   10 solo/self-coordinated days, OR
      //   2 core-team jobs of 12+ consecutive weeks each, OR
      //   5 solo days + 1 core-team job of 12+ weeks
      const soloDays = await prisma.workDate.count({
        where: {
          status: "CLAIMED",
          workRecord: { gradeHistoryId: openPeriod.id, performerId: userId, status: "APPROVED", isSoloSubmission: true },
        },
      });
      const coreJobCandidates = await prisma.workRecord.findMany({
        where: { gradeHistoryId: openPeriod.id, performerId: userId, status: "APPROVED", isCoreJob: true },
        select: { coreJobStartDate: true, coreJobEndDate: true },
      });
      const qualifyingCoreJobs = coreJobCandidates.filter((r) => isQualifyingCoreJob(r.coreJobStartDate, r.coreJobEndDate)).length;

      const met = soloDays >= 10 || qualifyingCoreJobs >= 2 || (soloDays >= 5 && qualifyingCoreJobs >= 1);
      requirements.push({
        type: def.type,
        targetValue: def.targetValue,
        approvedValue: soloDays,
        pendingValue: qualifyingCoreJobs,
        met,
        detail: `${soloDays} solo day${soloDays === 1 ? "" : "s"} · ${qualifyingCoreJobs} qualifying core-team job${qualifyingCoreJobs === 1 ? "" : "s"} (12+ weeks) — needs 10 solo days, or 2 core-team jobs, or 5 solo days + 1 core-team job`,
      });
    } else if (def.type === "POINTS") {
      // Key -> Full Member composite points system (explicit BSR policy), 4 categories:
      //   Solo Day - Own Job = 2 pts/day (approved isSoloSubmission days)
      //   Unit Coordinator Day = 1 pt/day (approved isUnitCoordinatorDay days)
      //   Self-Coordinating on another Coordinator's job = 1 pt/identifiable (FM-approved
      //     selfCoordinated identifiables, ignored on records that are themselves Solo)
      //   Supervision/Assistant Coordinator Day = 1 pt/day (approved isAssistantCoordinatorDay days)
      // Solo + Unit Coordinator (group A/B) is uncapped. Assistant Coordinator + Self-Coordinating
      // (group C/D) contributes at most 60 points toward the 80 total — that cap mathematically
      // guarantees at least 20 points must come from group A/B whenever the total reaches 80, so
      // no separate minimum check is needed.
      const soloDays = await prisma.workDate.count({
        where: { status: "CLAIMED", workRecord: { gradeHistoryId: openPeriod.id, performerId: userId, status: "APPROVED", isSoloSubmission: true } },
      });
      const unitCoordinatorDays = await prisma.workDate.count({
        where: { status: "CLAIMED", workRecord: { gradeHistoryId: openPeriod.id, performerId: userId, status: "APPROVED", isUnitCoordinatorDay: true } },
      });
      const assistantCoordinatorDays = await prisma.workDate.count({
        where: { status: "CLAIMED", workRecord: { gradeHistoryId: openPeriod.id, performerId: userId, status: "APPROVED", isAssistantCoordinatorDay: true } },
      });
      const selfCoordinatingCount = await prisma.identifiable.count({
        where: {
          status: "APPROVED",
          selfCoordinated: true,
          workRecord: { gradeHistoryId: openPeriod.id, performerId: userId, isSoloSubmission: false },
        },
      });

      const soloPoints = soloDays * 2;
      const unitCoordinatorPoints = unitCoordinatorDays * 1;
      const assistantCoordinatorPoints = assistantCoordinatorDays * 1;
      const selfCoordinatingPoints = selfCoordinatingCount * 1;

      const groupABPoints = soloPoints + unitCoordinatorPoints;
      const groupCDPoints = assistantCoordinatorPoints + selfCoordinatingPoints;
      const groupCDCounted = Math.min(groupCDPoints, 60);
      const totalPoints = groupABPoints + groupCDCounted;

      requirements.push({
        type: def.type,
        targetValue: def.targetValue,
        approvedValue: totalPoints,
        pendingValue: 0,
        met: totalPoints >= def.targetValue,
        pointsBreakdown: {
          soloDays,
          soloPoints,
          unitCoordinatorDays,
          unitCoordinatorPoints,
          selfCoordinatingCount,
          selfCoordinatingPoints,
          assistantCoordinatorDays,
          assistantCoordinatorPoints,
          groupABPoints,
          groupCDPoints,
          groupCDCounted,
        },
      });
    }
  }

  return {
    currentGrade: { key: user.currentGrade.key, label: user.currentGrade.label },
    nextGrade: { key: nextGrade.key, label: nextGrade.label },
    gradePeriodStartedAt: gradeStart.toISOString(),
    requirements,
    eligibleForUpgrade: requirements.length > 0 && requirements.every((r) => r.met),
  };
}
