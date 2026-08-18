import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// GET /api/committee/upgrade-applications/:id — structured evidence review (spec §20). The
// committee should be able to understand the evidence without reconstructing it from PDFs.
export async function GET(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const application = await prisma.upgradeApplication.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        evidenceLinks: {
          include: {
            workRecord: {
              include: {
                productionFamily: true,
                fullMember: { select: { id: true, name: true } },
                evidenceDocuments: true,
                identifiables: { where: { status: "APPROVED" }, include: { category: true } },
                workDates: { where: { status: "CLAIMED" }, select: { date: true } },
              },
            },
          },
        },
      },
    });
    if (!application) return notFound();

    const fromGrade = await prisma.grade.findUnique({ where: { id: application.fromGradeId } });
    const toGrade = await prisma.grade.findUnique({ where: { id: application.toGradeId } });

    // Senior -> Key is the only route with Solo/Self-Coordinated and Core Team jobs (they feed
    // the SOLO_OR_CORE_TEAM composite requirement) — those records get their own headings on this
    // page instead of cluttering the general production list, matching committee's mental model.
    const isSeniorApplicant = fromGrade?.key === "SENIOR_STUNT_PERFORMER";
    // Key -> Full Member is the only route with the 80-point composite (Solo/Unit/Assistant
    // Coordinator days + self-coordinated identifiables) — same idea, its own headed sections
    // plus the full points breakdown, since that's everything the requirement was built from.
    const isKeyApplicant = fromGrade?.key === "KEY_STUNT_PERFORMER";

    const evidenceLinks = application.evidenceLinks;

    const toProductionRow = (link: (typeof evidenceLinks)[number]) => {
      const wr = link.workRecord;
      return {
        workRecordId: wr.id,
        productionName: wr.continuationSequence > 0 ? `Cont ${wr.continuationSequence}: ${wr.productionFamily.rootName}` : wr.productionFamily.rootName,
        approvedDays: link.approvedDaysSnapshot,
        identifiableCount: link.approvedIdentifiablesSnapshot,
        fullMember: wr.fullMember,
        evidenceDocuments: wr.evidenceDocuments,
        dates: wr.workDates.map((d) => d.date),
      };
    };

    const productions = evidenceLinks
      .filter((link) => {
        if (isSeniorApplicant && (link.workRecord.isSoloSubmission || link.workRecord.isCoreJob)) return false;
        if (isKeyApplicant && (link.workRecord.isSoloSubmission || link.workRecord.isUnitCoordinatorDay || link.workRecord.isAssistantCoordinatorDay)) return false;
        return true;
      })
      .map(toProductionRow);

    const soloSubmissions =
      isSeniorApplicant || isKeyApplicant ? evidenceLinks.filter((link) => link.workRecord.isSoloSubmission).map(toProductionRow) : [];

    const coreTeamJobs = isSeniorApplicant ? evidenceLinks.filter((link) => link.workRecord.isCoreJob).map(toProductionRow) : [];

    const unitCoordinatorJobs = isKeyApplicant ? evidenceLinks.filter((link) => link.workRecord.isUnitCoordinatorDay).map(toProductionRow) : [];

    const assistantCoordinatorJobs = isKeyApplicant ? evidenceLinks.filter((link) => link.workRecord.isAssistantCoordinatorDay).map(toProductionRow) : [];

    const consolidatedIdentifiables = application.evidenceLinks.flatMap((link) =>
      link.workRecord.identifiables.map((i) => ({
        id: i.id,
        category: i.category.label,
        verifiedDescription: i.verifiedDescription ?? i.performerDescription,
        productionName: link.workRecord.continuationSequence > 0 ? `Cont ${link.workRecord.continuationSequence}: ${link.workRecord.productionFamily.rootName}` : link.workRecord.productionFamily.rootName,
        approvedBy: link.workRecord.fullMember?.name ?? null,
        selfCoordinated: i.selfCoordinated,
      }))
    );

    const selfCoordinatedIdentifiables = isKeyApplicant ? consolidatedIdentifiables.filter((i) => i.selfCoordinated) : [];

    // Computed from every contributing record, not just `productions` — Solo/Core Team days
    // still count toward the total even though they're broken out into their own sections.
    const totalApprovedDays = application.evidenceLinks.reduce((sum, link) => sum + link.approvedDaysSnapshot, 0);

    // Frozen mirror of lib/progress.ts's POINTS calculation, scoped to exactly the WorkRecords
    // this application snapshotted at submit time rather than the member's live grade period —
    // committee review should show what the application was actually approved on, not whatever
    // the member's progress happens to be by the time it's reviewed.
    let pointsBreakdown: null | {
      soloDays: number;
      soloPoints: number;
      unitCoordinatorDays: number;
      unitCoordinatorPoints: number;
      assistantCoordinatorDays: number;
      assistantCoordinatorPoints: number;
      selfCoordinatingCount: number;
      selfCoordinatingPoints: number;
      groupABPoints: number;
      groupCDPoints: number;
      groupCDCounted: number;
      totalPoints: number;
    } = null;
    if (isKeyApplicant) {
      const soloDays = soloSubmissions.reduce((sum, p) => sum + p.approvedDays, 0);
      const unitCoordinatorDays = unitCoordinatorJobs.reduce((sum, p) => sum + p.approvedDays, 0);
      const assistantCoordinatorDays = assistantCoordinatorJobs.reduce((sum, p) => sum + p.approvedDays, 0);
      const selfCoordinatingCount = selfCoordinatedIdentifiables.length;

      const soloPoints = soloDays * 2;
      const unitCoordinatorPoints = unitCoordinatorDays * 1;
      const assistantCoordinatorPoints = assistantCoordinatorDays * 1;
      const selfCoordinatingPoints = selfCoordinatingCount * 1;
      const groupABPoints = soloPoints + unitCoordinatorPoints;
      const groupCDPoints = assistantCoordinatorPoints + selfCoordinatingPoints;
      const groupCDCounted = Math.min(groupCDPoints, 60);

      pointsBreakdown = {
        soloDays,
        soloPoints,
        unitCoordinatorDays,
        unitCoordinatorPoints,
        assistantCoordinatorDays,
        assistantCoordinatorPoints,
        selfCoordinatingCount,
        selfCoordinatingPoints,
        groupABPoints,
        groupCDPoints,
        groupCDCounted,
        totalPoints: groupABPoints + groupCDCounted,
      };
    }

    return ok({
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
        decidedAt: application.decidedAt,
        decisionMessage: application.decisionMessage,
        member: application.user,
        fromGrade: fromGrade ? { key: fromGrade.key, label: fromGrade.label } : null,
        toGrade: toGrade ? { key: toGrade.key, label: toGrade.label } : null,
      },
      totalApprovedDays,
      productions,
      soloSubmissions,
      coreTeamJobs,
      unitCoordinatorJobs,
      assistantCoordinatorJobs,
      consolidatedIdentifiables,
      selfCoordinatedIdentifiables,
      pointsBreakdown,
    });
  } catch (err) {
    return serverError(err);
  }
}
