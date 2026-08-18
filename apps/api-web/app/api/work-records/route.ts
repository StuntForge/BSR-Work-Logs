import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isQualifyingCoreJob } from "@/lib/eligibility";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";

// GET /api/work-records?tab=ongoing|archive&status=Approved|Submitted|Ongoing|Rejected
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const tab = req.nextUrl.searchParams.get("tab") ?? "ongoing";
    const statusFilter = req.nextUrl.searchParams.get("status");

    const statuses =
      tab === "archive"
        ? ["ARCHIVED"]
        : statusFilter && statusFilter !== "All"
        ? [statusFilter.toUpperCase()]
        : ["ONGOING", "SUBMITTED", "APPROVED", "REJECTED"];

    const records = await prisma.workRecord.findMany({
      where: { performerId: session.id, status: { in: statuses as any } },
      orderBy: { createdAt: "desc" },
      include: {
        productionFamily: true,
        workDates: true,
        identifiables: true,
        fullMember: { select: { id: true, name: true } },
      },
    });

    return ok({
      records: records.map((r) => ({
        id: r.id,
        productionName:
          r.continuationSequence > 0
            ? `Cont ${r.continuationSequence}: ${r.productionFamily.rootName}`
            : r.productionFamily.rootName,
        status: r.status,
        days: r.workDates.filter((d) => d.status === "CLAIMED").length,
        identifiables: r.identifiables.length,
        fullMember: r.fullMember,
        createdAt: r.createdAt,
        isQualifyingCoreJob: isQualifyingCoreJob(r.coreJobStartDate, r.coreJobEndDate),
        isSoloSubmission: r.isSoloSubmission,
        isUnitCoordinatorDay: r.isUnitCoordinatorDay,
        isAssistantCoordinatorDay: r.isAssistantCoordinatorDay,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

const createSchema = z.object({ productionName: z.string().min(1) });

// POST /api/work-records — create a brand-new production (not a continuation; see /continue)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const body = createSchema.safeParse(await req.json());
    if (!body.success) return badRequest("Production name is required.");

    const openPeriod = await prisma.gradeHistory.findFirst({
      where: { userId: session.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (!openPeriod) return badRequest("No active grade period for this account.");

    const family = await prisma.productionFamily.create({
      data: { rootName: body.data.productionName, ownerId: session.id },
    });

    const record = await prisma.workRecord.create({
      data: {
        productionFamilyId: family.id,
        performerId: session.id,
        gradeHistoryId: openPeriod.id,
        status: "ONGOING",
      },
    });

    return ok({ id: record.id }, 201);
  } catch (err) {
    return serverError(err);
  }
}
