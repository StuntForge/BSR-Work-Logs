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
