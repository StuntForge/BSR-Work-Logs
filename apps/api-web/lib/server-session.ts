import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";

// Server Component / layout variant of getSession (route handlers use lib/auth.ts's version,
// which reads from a NextRequest instead of next/headers).
export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("bsr_token")?.value;
  if (!token) return null;

  let payload: { sub: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { sub: string };
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { currentGrade: true } });
  if (!user || !user.active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isCommittee: user.isCommittee,
    isFullMember: user.currentGrade?.key === "FULL_MEMBER",
    currentGradeKey: user.currentGrade?.key ?? null,
  };
}
