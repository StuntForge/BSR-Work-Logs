// Effective start of a member's current grade period, used both to compute "days since last
// upgrade" and to decide which dates they're allowed to claim. Priority order:
//   1. lastUpgradedAt — committee-set override, authoritative once present (spec §32 territory:
//      corrects members who upgraded before this system existed).
//   2. dateJoined — for a Probationary member there IS no lastUpgradedAt (they've never
//      upgraded), so their whole history runs from when they joined BSR instead.
//   3. gradeHistory.startedAt — the tracked GradeHistory row, whenever neither of the above has
//      been set by the committee yet.
export function effectiveGradeStart(
  user: { lastUpgradedAt: Date | null; dateJoined: Date | null },
  gradeHistoryStartedAt: Date
): Date {
  return user.lastUpgradedAt ?? user.dateJoined ?? gradeHistoryStartedAt;
}

// A Core Team job only counts toward the Senior -> Key composite requirement once its date
// range is 12+ consecutive weeks (explicit BSR policy) — checking the checkbox alone isn't
// enough, the range has to actually qualify.
export const CORE_JOB_MIN_WEEKS = 12;
export const CORE_JOB_MIN_DAYS = CORE_JOB_MIN_WEEKS * 7;

export function isQualifyingCoreJob(startDate: Date | null, endDate: Date | null): boolean {
  if (!startDate || !endDate) return false;
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) >= CORE_JOB_MIN_DAYS;
}
