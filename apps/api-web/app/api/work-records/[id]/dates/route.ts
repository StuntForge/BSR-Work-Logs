import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDateEligibleForPeriod } from "@bsr/shared";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

const schema = z.object({ dates: z.array(z.string().min(1)).min(1) });

// POST /api/work-records/:id/dates — tap dates on the calendar (spec §6). Adding dates never
// generates an approval request or coordinator notification (spec §11).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const record = await prisma.workRecord.findUnique({ where: { id: params.id }, include: { gradeHistory: true } });
    if (!record) return notFound();
    if (record.performerId !== session.id) return forbidden();
    if (record.status !== "ONGOING") return forbidden("Only Ongoing records accept new dates.");

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Provide at least one date.");

    const parsedDates = body.data.dates.map((d) => new Date(d));
    if (parsedDates.some((d) => isNaN(d.getTime()))) return badRequest("Invalid date.");

    // Server-side cutoff enforcement, not only UI (spec §6, §29).
    const ineligible = parsedDates.filter((d) => !isDateEligibleForPeriod(d, record.gradeHistory.startedAt));
    if (ineligible.length > 0) {
      return badRequest("One or more dates fall before your current grade period started and cannot be claimed.");
    }

    await prisma.workDate.createMany({
      data: parsedDates.map((date) => ({ workRecordId: record.id, date, status: "CLAIMED" as const })),
      skipDuplicates: true,
    });

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
