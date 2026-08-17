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
}


export interface ProgressResult {
  currentGrade: { key: string; label: string } | null;
  nextGrade: { key: string; label: string } | null;
  gradePeriodStartedAt: string | null;
  requirements: RequirementProgress[];
  eligibleForUpgrade: boolean;
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
      const qualification = await prisma.qualification.findFirst({ where: { userId, type: "HEALTH_SAFETY" } });
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
    } else {
      // POINTS — architecture placeholder only, no capture mechanics yet (spec §24, §32).
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue: 0, pendingValue: 0, met: false });
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
