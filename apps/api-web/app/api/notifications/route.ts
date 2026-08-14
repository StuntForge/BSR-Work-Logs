import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/http";

// GET /api/notifications — in-app notifications (spec §28): work-approval results and
// upgrade decisions land here.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const notifications = await prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok({
      notifications,
      unreadCount: notifications.filter((n) => !n.readAt).length,
    });
  } catch (err) {
    return serverError(err);
  }
}
