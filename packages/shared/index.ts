// Shared constants/types used by both apps/api-web and apps/mobile.
// Keep in sync with packages/db/prisma/schema.prisma enums.

export const GRADE_KEYS = [
  "PROBATIONARY",
  "STUNT_PERFORMER",
  "SENIOR_STUNT_PERFORMER",
  "KEY_STUNT_PERFORMER",
  "FULL_MEMBER",
] as const;
export type GradeKey = (typeof GRADE_KEYS)[number];

export const GRADE_LABELS: Record<GradeKey, string> = {
  PROBATIONARY: "Probationary Member",
  STUNT_PERFORMER: "Stunt Performer",
  SENIOR_STUNT_PERFORMER: "Senior Stunt Performer",
  KEY_STUNT_PERFORMER: "Key Stunt Performer",
  FULL_MEMBER: "Full Member",
};

// index into GRADE_KEYS = order - 1. Full Member has no further route (spec §2).
export function nextGradeKey(current: GradeKey): GradeKey | null {
  const idx = GRADE_KEYS.indexOf(current);
  if (idx === -1 || idx === GRADE_KEYS.length - 1) return null;
  return GRADE_KEYS[idx + 1];
}

export const WORK_RECORD_STATUS = [
  "ONGOING",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;
export type WorkRecordStatus = (typeof WORK_RECORD_STATUS)[number];

export const WORK_DATE_STATUS = ["CLAIMED", "REJECTED"] as const;
export type WorkDateStatus = (typeof WORK_DATE_STATUS)[number];

export const IDENTIFIABLE_STATUS = ["SUBMITTED", "APPROVED", "REJECTED"] as const;
export type IdentifiableStatus = (typeof IDENTIFIABLE_STATUS)[number];

export const WORK_LOCATION = ["STUDIO", "UK", "OVERSEAS"] as const;
export type WorkLocation = (typeof WORK_LOCATION)[number];
// Display labels only — stored values stay STUDIO/UK/OVERSEAS to avoid a schema/data migration.
export const WORK_LOCATION_LABELS: Record<WorkLocation, string> = {
  STUDIO: "UK Studio",
  UK: "Domestic Location",
  OVERSEAS: "International",
};

export const UPGRADE_APPLICATION_STATUS = ["PENDING", "APPROVED", "REJECTED"] as const;
export type UpgradeApplicationStatus = (typeof UPGRADE_APPLICATION_STATUS)[number];

// Active types are implemented in V1. Placeholder types exist so the requirement
// engine is extensible without a redesign (spec §24) — they are NOT wired up to any
// capture UI yet because the underlying policy is explicitly undecided (spec §32).
export const REQUIREMENT_TYPES = [
  "DAYS_WORKED",
  "IDENTIFIABLES",
  "MIN_TIME_AT_GRADE",
  "COORDINATOR_SPREAD",
  "HEALTH_SAFETY",
  "SOLO_DAYS",
  "CORE_JOBS",
  "POINTS",
] as const;
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

// Coordinator Spread was tried and explicitly dropped — not a real BSR requirement.
export const ACTIVE_REQUIREMENT_TYPES: RequirementType[] = ["DAYS_WORKED", "IDENTIFIABLES", "MIN_TIME_AT_GRADE", "HEALTH_SAFETY"];

export const AREA_CATEGORY_KEYS = ["A", "B", "C", "D", "E", "F"] as const;
export type AreaCategoryKey = (typeof AREA_CATEGORY_KEYS)[number];

export const EVIDENCE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
export const EVIDENCE_MAX_BYTES = 20 * 1024 * 1024; // 20MB — engineering default, not BSR policy (see plan).

// Same-day-as-upgrade edge case is explicitly undecided by the spec (§6, §32). This is a
// narrow, documented default (exclusive boundary) isolated here so it's a one-line change later.
export function isDateEligibleForPeriod(date: Date, gradePeriodStartAt: Date): boolean {
  return date.getTime() > gradePeriodStartAt.getTime();
}

export const SUBMIT_FOR_APPROVAL_HELP_TEXT =
  "Please submit your work record towards the end of your engagement, or when you need the verified work for an upgrade. Grouping your work into fewer submissions helps reduce administration for Stunt Coordinators.";
