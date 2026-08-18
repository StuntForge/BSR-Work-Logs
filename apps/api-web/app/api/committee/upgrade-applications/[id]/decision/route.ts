import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { writeAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), message: z.string().optional() });

// POST /api/committee/upgrade-applications/:id/decision — the committee's final call (spec §21).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const application = await prisma.upgradeApplication.findUnique({ where: { id: params.id } });
    if (!application) return notFound();
    if (application.status !== "PENDING") return forbidden("This application has already been decided.");

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Invalid decision.");
    if (body.data.decision === "REJECTED" && !body.data.message?.trim()) {
      return badRequest("A reason is required when rejecting.");
    }

    if (body.data.decision === "REJECTED") {
      // Reject: feedback only. Grade, approved work and progress are untouched — never reset
      // progress on a rejected upgrade (spec §21.1, §33).
      await prisma.upgradeApplication.update({
        where: { id: application.id },
        data: { status: "REJECTED", decidedAt: new Date(), decidedById: session.id, decisionMessage: body.data.message },
      });
    } else {
      // Approve: 8-step transaction per spec §21.2.
      const openPeriod = await prisma.gradeHistory.findFirstOrThrow({
        where: { userId: application.userId, endedAt: null },
        orderBy: { startedAt: "desc" },
      });

      await prisma.$transaction(async (tx) => {
        const decidedAt = new Date();

        // 1. Record committee approval + timestamp.
        await tx.upgradeApplication.update({
          where: { id: application.id },
          data: { status: "APPROVED", decidedAt, decidedById: session.id, decisionMessage: body.data.message },
        });

        // 2 & 3 & 4. Advance grade, append Grade History, new grade start date/time.
        await tx.gradeHistory.updateMany({ where: { id: openPeriod.id }, data: { endedAt: decidedAt } });
        await tx.gradeHistory.create({
          data: {
            userId: application.userId,
            gradeId: application.toGradeId,
            startedAt: decidedAt,
            createdByUpgradeApplicationId: application.id,
          },
        });
        // Keep lastUpgradedAt in sync automatically for upgrades that go through the app — it
        // only needs manual committee correction for historical members who upgraded before
        // this system existed (spec §32 territory, see the User model comment).
        await tx.user.update({ where: { id: application.userId }, data: { currentGradeId: application.toGradeId, lastUpgradedAt: decidedAt } });

        // 5. Move every production from that closed grade period into Archive, regardless of
        // status (Ongoing/Submitted/Rejected too, not just Approved) — Qualifying Work should be
        // completely empty at the start of a new grade period.
        await tx.workRecord.updateMany({
          where: { gradeHistoryId: openPeriod.id, performerId: application.userId },
          data: { status: "ARCHIVED" },
        });

        // 6 & 7. Next requirement set and reset progress: both fall out naturally — progress is
        // always computed live from the new (empty) grade period, and RequirementDefinitions
        // for the new current grade's own next target are looked up dynamically (lib/progress.ts).
      });
    }

    if (!session.isAdmin) {
      await writeAudit({
        actorId: session.id,
        action: `UPGRADE_${body.data.decision}`,
        entityType: "UpgradeApplication",
        entityId: application.id,
        before: { status: "PENDING" },
        after: { status: body.data.decision, message: body.data.message },
      });
    }

    await notify({
      userId: application.userId,
      type: "UPGRADE_DECISION",
      title: body.data.decision === "APPROVED" ? "Upgrade approved" : "Upgrade application rejected",
      body: body.data.message || (body.data.decision === "APPROVED" ? "Congratulations — your upgrade has been approved." : "Your upgrade application was rejected."),
      relatedEntityType: "UpgradeApplication",
      relatedEntityId: application.id,
    });

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
