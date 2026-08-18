import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// PATCH /api/auth/profile — self-service password change for any portal user (admin included).
// Username is fixed once created (only the Committee Users page, admin-only, can change other
// people's accounts) — this endpoint only ever touches the caller's own password.
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("New password must be at least 8 characters.");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
    const validCurrent = await verifyPassword(body.data.currentPassword, user.passwordHash);
    if (!validCurrent) return badRequest("Current password is incorrect.");

    const passwordHash = await hashPassword(body.data.newPassword);
    await prisma.user.update({ where: { id: session.id }, data: { passwordHash, mustChangePassword: false } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
