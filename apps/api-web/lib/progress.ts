import { prisma } from "./prisma";
import { nextGradeKey, type GradeKey } from "@bsr/shared";

export interface RequirementProgress {
  type: string;
  targetValue: number;
  approvedValue: number;
  pendingValue: number;
  met: boolean;
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
      const daysServed = Math.floor((Date.now() - openPeriod.startedAt.getTime()) / (1000 * 60 * 60 * 24));
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue: daysServed, pendingValue: 0, met: daysServed >= def.targetValue });
    } else if (def.type === "COORDINATOR_SPREAD") {
      const approvedRecords = await prisma.workRecord.findMany({
        where: { gradeHistoryId: openPeriod.id, performerId: userId, status: "APPROVED", fullMemberId: { not: null } },
        select: { fullMemberId: true },
        distinct: ["fullMemberId"],
      });
      const approvedValue = approvedRecords.length;
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue, pendingValue: 0, met: approvedValue >= def.targetValue });
    } else if (def.type === "HEALTH_SAFETY") {
      const qualification = await prisma.qualification.findFirst({ where: { userId, type: "HEALTH_SAFETY" } });
      const met = qualification?.status === "COMPLETE";
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue: met ? 1 : 0, pendingValue: 0, met });
    } else {
      // SOLO_DAYS / CORE_JOBS / POINTS — architecture placeholder only, no capture mechanics yet (spec §24, §32).
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue: 0, pendingValue: 0, met: false });
    }
  }

  return {
    currentGrade: { key: user.currentGrade.key, label: user.currentGrade.label },
    nextGrade: { key: nextGrade.key, label: nextGrade.label },
    gradePeriodStartedAt: openPeriod.startedAt.toISOString(),
    requirements,
    eligibleForUpgrade: requirements.length > 0 && requirements.every((r) => r.met),
  };
}
