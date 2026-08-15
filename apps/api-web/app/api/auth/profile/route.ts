import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";

const schema = z.object({
  currentPassword: z.string().min(1),
  email: z.string().email().optional(),
  newPassword: z.string().min(8).optional(),
});

// PATCH /api/auth/profile — self-service update of your own email/password. Used by the
// committee Settings page to manage the single web-portal login; current password is always
// required to authorize a change, even to a session that's already logged in.
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("Invalid request.");
    if (!body.data.email && !body.data.newPassword) return badRequest("Nothing to update.");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
    const validCurrent = await verifyPassword(body.data.currentPassword, user.passwordHash);
    if (!validCurrent) return badRequest("Current password is incorrect.");

    const data: Record<string, unknown> = {};
    if (body.data.email) data.email = body.data.email.toLowerCase();
    if (body.data.newPassword) {
      data.passwordHash = await hashPassword(body.data.newPassword);
      data.mustChangePassword = false;
    }

    await prisma.user.update({ where: { id: session.id }, data });
    return ok({ success: true });
  } catch (err: any) {
    if (err?.code === "P2002") return badRequest("That email is already in use.");
    return serverError(err);
  }
}
