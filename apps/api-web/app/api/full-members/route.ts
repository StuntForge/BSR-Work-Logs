import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/http";

// GET /api/full-members?query=... — searchable selector; only active Full Member accounts
// are valid options (spec §10). Free text that doesn't resolve to one of these is rejected
// at submit time server-side.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const query = req.nextUrl.searchParams.get("query") ?? "";

    const users = await prisma.user.findMany({
      where: {
        active: true,
        currentGrade: { key: "FULL_MEMBER" },
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 20,
    });

    return ok({ fullMembers: users });
  } catch (err) {
    return serverError(err);
  }
}
