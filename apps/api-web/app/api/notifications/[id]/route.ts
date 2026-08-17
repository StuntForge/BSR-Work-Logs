import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

// DELETE /api/notifications/:id — dismiss a single notification (e.g. swipe to dismiss).
export async function DELETE(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
  const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const notif = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!notif) return notFound();
    if (notif.userId !== session.id) return forbidden();

    await prisma.notification.delete({ where: { id: params.id } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
