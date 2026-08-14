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
              },
            },
          },
        },
      },
    });
    if (!application) return notFound();

    const fromGrade = await prisma.grade.findUnique({ where: { id: application.fromGradeId } });
    const toGrade = await prisma.grade.findUnique({ where: { id: application.toGradeId } });

    const productions = application.evidenceLinks.map((link) => {
      const wr = link.workRecord;
      return {
        workRecordId: wr.id,
        productionName: wr.continuationSequence > 0 ? `Cont ${wr.continuationSequence}: ${wr.productionFamily.rootName}` : wr.productionFamily.rootName,
        approvedDays: link.approvedDaysSnapshot,
        identifiableCount: link.approvedIdentifiablesSnapshot,
        fullMember: wr.fullMember,
        evidenceDocuments: wr.evidenceDocuments,
      };
    });

    const consolidatedIdentifiables = application.evidenceLinks.flatMap((link) =>
      link.workRecord.identifiables.map((i) => ({
        id: i.id,
        category: i.category.label,
        verifiedDescription: i.verifiedDescription ?? i.performerDescription,
        productionName: link.workRecord.continuationSequence > 0 ? `Cont ${link.workRecord.continuationSequence}: ${link.workRecord.productionFamily.rootName}` : link.workRecord.productionFamily.rootName,
        approvedBy: link.workRecord.fullMember?.name ?? null,
      }))
    );

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
      productions,
      consolidatedIdentifiables,
    });
  } catch (err) {
    return serverError(err);
  }
}
