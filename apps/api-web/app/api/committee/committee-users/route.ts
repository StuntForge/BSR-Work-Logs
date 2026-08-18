import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, generateTempPassword, hashPassword } from "@/lib/auth";
import { isAdminSession } from "@/lib/committee";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/http";

// GET /api/committee/committee-users — every committee account except the admin themselves
// (the admin manages their own login via Settings, not this page). Admin-only.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isAdminSession(session)) return session ? forbidden() : unauthorized();

    const users = await prisma.user.findMany({
      where: { isCommittee: true, isAdmin: false },
      orderBy: { name: "asc" },
    });

    return ok({
      users: users.map((u) => ({ id: u.id, name: u.name, username: u.username, active: u.active, createdAt: u.createdAt })),
    });
  } catch (err) {
    return serverError(err);
  }
}

const createSchema = z.object({ name: z.string().min(1), username: z.string().min(1) });

// POST /api/committee/committee-users — create a new committee (web-portal-only) login.
// Admin-only. Members' email stays required by the schema, so a placeholder is generated —
// committee accounts sign in by username and never see/use this address.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isAdminSession(session)) return session ? forbidden() : unauthorized();

    const body = createSchema.safeParse(await req.json());
    if (!body.success) return badRequest("Name and username are required.");

    const username = body.data.username.toLowerCase();
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        name: body.data.name,
        email: `${username}@bsr.internal`,
        username,
        passwordHash,
        isCommittee: true,
        mustChangePassword: true,
      },
    });

    return ok({ id: user.id, tempPassword }, 201);
  } catch (err: any) {
    if (err?.code === "P2002") return badRequest("That username is already in use.");
    return serverError(err);
  }
}
