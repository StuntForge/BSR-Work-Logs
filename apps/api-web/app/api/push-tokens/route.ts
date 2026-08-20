import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";

const schema = z.object({ token: z.string().min(1) });

// POST /api/push-tokens — the mobile app registers its Expo push token here on login/app start.
// A token is unique per device install, not per user — upsert-by-token so a device that's since
// logged in as a different member gets reassigned rather than creating a duplicate row.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const body = schema.safeParse(await req.json());
    if (!body.success) return badRequest("A push token is required.");

    await prisma.pushToken.upsert({
      where: { token: body.data.token },
      create: { userId: session.id, token: body.data.token },
      update: { userId: session.id },
    });

    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
