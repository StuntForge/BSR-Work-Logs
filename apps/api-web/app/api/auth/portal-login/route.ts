import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";

const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });

// POST /api/auth/portal-login — the committee web portal's own login, entirely separate from
// /api/auth/login (mobile, email-based). Username-based, and only ever succeeds for isCommittee
// accounts — this is the one place a committee/admin session gets issued.
export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Username and password are required.");

    const user = await prisma.user.findUnique({
      where: { username: body.data.username.toLowerCase() },
      include: { currentGrade: true },
    });
    if (!user || !user.active || !user.isCommittee) return unauthorized("Invalid username or password.");

    const validPassword = await verifyPassword(body.data.password, user.passwordHash);
    if (!validPassword) return unauthorized("Invalid username or password.");

    const token = signToken(user.id);
    const res = ok({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        isCommittee: user.isCommittee,
        isAdmin: user.isAdmin,
        mustChangePassword: user.mustChangePassword,
      },
    });
    res.cookies.set("bsr_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return serverError(err);
  }
}
