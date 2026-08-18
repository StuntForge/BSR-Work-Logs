import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const TOKEN_TTL = "30d";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  isCommittee: boolean;
  isFullMember: boolean;
  currentGradeKey: string | null;
  dateJoined: Date | null;
  lastUpgradedAt: Date | null;
}

// No self-registration or email infra in V1 (spec §29) — committee relays this temp password
// to the member directly; mustChangePassword forces them to set their own on first login. Fixed
// rather than random so the committee doesn't need to relay a unique string per account.
export function generateTempPassword() {
  return "ChangeMe123!";
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function verifyToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string };
  } catch {
    return null;
  }
}

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  const cookie = req.cookies.get("bsr_token");
  return cookie?.value ?? null;
}

// Server-side session resolution — used by every protected route handler.
// Never trust a client-supplied role/grade; always re-derive from the DB (spec §29, §33).
export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  const token = extractToken(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { currentGrade: true },
  });
  if (!user || !user.active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isCommittee: user.isCommittee,
    isFullMember: user.currentGrade?.key === "FULL_MEMBER",
    currentGradeKey: user.currentGrade?.key ?? null,
    dateJoined: user.dateJoined,
    lastUpgradedAt: user.lastUpgradedAt,
  };
}
