import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/http";

export async function POST(req: NextRequest, { params: __params }: { params: Promise<{ id: string }> }) {
    const params = await __params;
  try {
    const session = await getSession(req);
    if (!session) return unauthorized();

    const notification = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!notification) return notFound();
    if (notification.userId !== session.id) return forbidden();

    await prisma.notification.update({ where: { id: params.id }, data: { readAt: new Date() } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
