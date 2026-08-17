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

  // lastUpgradedAt is a committee-editable override for members who upgraded before this system
  // existed (their GradeHistory.startedAt would otherwise just be whenever their account was
  // created here, not their real history) — falls back to the tracked grade period start for
  // everyone else, and for upgrades that go through the app the two are kept in sync automatically.
  const effectiveGradeStart = user.lastUpgradedAt ?? openPeriod.startedAt;

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
      const daysServed = Math.floor((Date.now() - effectiveGradeStart.getTime()) / (1000 * 60 * 60 * 24));
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue: daysServed, pendingValue: 0, met: daysServed >= def.targetValue });
    } else if (def.type === "HEALTH_SAFETY") {
      // Level is set by the committee, not the member (spec §25 workflow TBD; explicit policy:
      // required level rises with grade). Met when their current level is at least what's required.
      const qualification = await prisma.qualification.findFirst({ where: { userId, type: "HEALTH_SAFETY" } });
      const level = qualification?.level ?? 0;
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue: level, pendingValue: 0, met: level >= def.targetValue });
    } else {
      // SOLO_DAYS / CORE_JOBS / POINTS — architecture placeholder only, no capture mechanics yet (spec §24, §32).
      requirements.push({ type: def.type, targetValue: def.targetValue, approvedValue: 0, pendingValue: 0, met: false });
    }
  }

  return {
    currentGrade: { key: user.currentGrade.key, label: user.currentGrade.label },
    nextGrade: { key: nextGrade.key, label: nextGrade.label },
    gradePeriodStartedAt: effectiveGradeStart.toISOString(),
    requirements,
    eligibleForUpgrade: requirements.length > 0 && requirements.every((r) => r.met),
  };
}
