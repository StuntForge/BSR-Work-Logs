import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { ok, unauthorized, serverError } from "@/lib/http";

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

// GET /api/cron/weekly-digest — triggered weekly by Vercel Cron (see vercel.json). One push per
// Full Member, only if they have outstanding work records to approve — not one push per record,
// just a single "you have N waiting" digest, and never more than once every 6 days even if this
// somehow fires twice in a week.
export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) return unauthorized();
    }

    const fullMembers = await prisma.user.findMany({
      where: { active: true, currentGrade: { key: "FULL_MEMBER" } },
      select: { id: true, lastApprovalDigestSentAt: true },
    });

    const cutoff = new Date(Date.now() - SIX_DAYS_MS);
    let sent = 0;

    for (const member of fullMembers) {
      if (member.lastApprovalDigestSentAt && member.lastApprovalDigestSentAt > cutoff) continue;

      const outstanding = await prisma.workRecord.count({
        where: { fullMemberId: member.id, status: "SUBMITTED" },
      });
      if (outstanding === 0) continue;

      await sendPush(
        member.id,
        "Work approvals waiting",
        `You have ${outstanding} work record${outstanding === 1 ? "" : "s"} awaiting your approval.`
      );
      await prisma.user.update({ where: { id: member.id }, data: { lastApprovalDigestSentAt: new Date() } });
      sent++;
    }

    return ok({ sent });
  } catch (err) {
    return serverError(err);
  }
}
