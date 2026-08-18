import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, generateTempPassword, hashPassword } from "@/lib/auth";
import { isAdminSession } from "@/lib/committee";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// POST /api/committee/committee-users/:id/reset-password — admin-only, mirrors the member
// reset-password flow (fixed temp password, relayed by the admin directly, no email infra).
export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!isAdminSession(session)) return session ? forbidden() : unauthorized();

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user || !user.isCommittee || user.isAdmin) return notFound();

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    await prisma.user.update({ where: { id: params.id }, data: { passwordHash, mustChangePassword: true } });

    return ok({ tempPassword });
  } catch (err) {
    return serverError(err);
  }
}
