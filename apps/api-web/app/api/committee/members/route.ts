import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, generateTempPassword, hashPassword } from "@/lib/auth";
import { isCommitteeSession } from "@/lib/committee";
import { writeAudit } from "@/lib/audit";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/http";

// GET /api/committee/members?query=&gradeKey=&active=true|false — view/search/filter BSR
// members (spec §23). This list is every mobile-app member account; the committee's own web
// portal login is managed separately via /api/auth/profile, never shown here.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const query = req.nextUrl.searchParams.get("query") ?? undefined;
    const gradeKey = req.nextUrl.searchParams.get("gradeKey") ?? undefined;
    const activeParam = req.nextUrl.searchParams.get("active");

    const users = await prisma.user.findMany({
      where: {
        isCommittee: false,
        name: query ? { contains: query, mode: "insensitive" } : undefined,
        currentGrade: gradeKey ? { key: gradeKey as any } : undefined,
        active: activeParam ? activeParam === "true" : undefined,
      },
      include: { currentGrade: true },
      orderBy: { name: "asc" },
    });

    return ok({
      members: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        active: u.active,
        currentGrade: u.currentGrade ? { key: u.currentGrade.key, label: u.currentGrade.label } : null,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  gradeKey: z.string().min(1),
});

// POST /api/committee/members — create a new BSR member account (spec §23). No public
// self-service registration exists (spec §29); this is the only way a member account is
// created. Always a mobile-app member — never a committee account (there is exactly one
// committee login, managed via Settings, not created here).
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!isCommitteeSession(session)) return session ? forbidden() : unauthorized();

    const body = createSchema.safeParse(await req.json());
    if (!body.success) return badRequest("Name, email and grade are required.");

    const grade = await prisma.grade.findUnique({ where: { key: body.data.gradeKey as any } });
    if (!grade) return badRequest("Invalid grade.");

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: body.data.name,
          email: body.data.email.toLowerCase(),
          passwordHash,
          currentGradeId: grade.id,
          isCommittee: false,
          mustChangePassword: true,
        },
      });
      await tx.gradeHistory.create({ data: { userId: created.id, gradeId: grade.id } });
      return created;
    });

    await writeAudit({ actorId: session.id, action: "MEMBER_CREATED", entityType: "User", entityId: user.id, after: { email: user.email, gradeKey: body.data.gradeKey } });

    return ok({ id: user.id, tempPassword }, 201);
  } catch (err: any) {
    if (err?.code === "P2002") return badRequest("A user with that email already exists.");
    return serverError(err);
  }
}
