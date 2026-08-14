import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Email and password are required.");

    const user = await prisma.user.findUnique({
      where: { email: body.data.email.toLowerCase() },
      include: { currentGrade: true },
    });
    if (!user || !user.active) return unauthorized("Invalid email or password.");

    const validPassword = await verifyPassword(body.data.password, user.passwordHash);
    if (!validPassword) return unauthorized("Invalid email or password.");

    const token = signToken(user.id);
    const res = ok({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isCommittee: user.isCommittee,
        isFullMember: user.currentGrade?.key === "FULL_MEMBER",
        currentGradeKey: user.currentGrade?.key ?? null,
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
