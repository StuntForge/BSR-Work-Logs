import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/http";

// GET /api/committee/area-categories — full taxonomy including inactive items, for management (spec §7).
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const categories = await prisma.areaCategory.findMany({
      orderBy: { order: "asc" },
      include: { items: { orderBy: { order: "asc" } } },
    });
    return ok({ categories });
  } catch (err) {
    return serverError(err);
  }
}

const schema = z.object({ key: z.string().min(1).max(1), label: z.string().min(1), order: z.number().int() });

// POST /api/committee/area-categories — committee can add categories as BSR practice changes.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Key, label and order are required.");

    const category = await prisma.areaCategory.create({ data: body.data });
    return ok({ id: category.id }, 201);
  } catch (err: any) {
    if (err?.code === "P2002") return badRequest("That category key already exists.");
    return serverError(err);
  }
}
