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
      include: { currentGrade: true, qualifications: { where: { type: "HEALTH_SAFETY" }, orderBy: { updatedAt: "desc" } } },
      orderBy: { name: "asc" },
    });

    return ok({
      members: users.map((u) => {
        // Accounts created before firstName/surname existed only have `name` — split it on read
        // rather than backfilling every historical row.
        const [fallbackFirst, ...fallbackRest] = u.name.trim().split(/\s+/);
        return {
          id: u.id,
          firstName: u.firstName ?? fallbackFirst ?? u.name,
          surname: u.surname ?? (fallbackRest.length > 0 ? fallbackRest.join(" ") : ""),
          name: u.name,
          email: u.email,
          active: u.active,
          currentGrade: u.currentGrade ? { key: u.currentGrade.key, label: u.currentGrade.label } : null,
          healthSafetyLevel: u.qualifications[0]?.level ?? 0,
          dateJoined: u.dateJoined,
          lastUpgradedAt: u.lastUpgradedAt,
        };
      }),
    });
  } catch (err) {
    return serverError(err);
  }
}

const createSchema = z.object({
  firstName: z.string().min(1),
  surname: z.string().min(1),
  email: z.string().email(),
  gradeKey: z.string().min(1),
  dateJoined: z.string().nullable().optional(),
  // Only meaningful when gradeKey isn't PROBATIONARY (the web form only shows the field then),
  // but the API accepts it regardless rather than special-casing PROBATIONARY server-side too.
  lastUpgradedAt: z.string().nullable().optional(),
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
    if (!body.success) return badRequest("First name, surname, email and grade are required.");

    const grade = await prisma.grade.findUnique({ where: { key: body.data.gradeKey as any } });
    if (!grade) return badRequest("Invalid grade.");

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const name = `${body.data.firstName.trim()} ${body.data.surname.trim()}`;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          firstName: body.data.firstName.trim(),
          surname: body.data.surname.trim(),
          email: body.data.email.toLowerCase(),
          passwordHash,
          currentGradeId: grade.id,
          isCommittee: false,
          mustChangePassword: true,
          dateJoined: body.data.dateJoined ? new Date(body.data.dateJoined) : null,
          lastUpgradedAt: body.data.lastUpgradedAt ? new Date(body.data.lastUpgradedAt) : null,
        },
      });
      await tx.gradeHistory.create({ data: { userId: created.id, gradeId: grade.id } });
      return created;
    });

    // Nothing the administrator does is written to the audit log — everyone else's actions are.
    if (!session.isAdmin) {
      await writeAudit({ actorId: session.id, action: "MEMBER_CREATED", entityType: "User", entityId: user.id, after: { email: user.email, gradeKey: body.data.gradeKey } });
    }

    return ok({ id: user.id, tempPassword }, 201);
  } catch (err: any) {
    if (err?.code === "P2002") return badRequest("A user with that email already exists.");
    return serverError(err);
  }
}
