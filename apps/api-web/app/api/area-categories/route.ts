import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/http";

// GET /api/area-categories — dynamic, committee-managed A-F taxonomy (spec §7).
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const categories = await prisma.areaCategory.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { items: { where: { active: true }, orderBy: { order: "asc" } } },
    });

    return ok({ categories });
  } catch (err) {
    return serverError(err);
  }
}
