import { prisma } from "./prisma";

// In-app only for V1 (spec §28 — push/email cadence explicitly undecided).
export async function notify(params: {
  userId: string;
  type: "WORK_APPROVAL_DECISION" | "UPGRADE_DECISION" | "SUPPORT_TICKET_RESPONSE";
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
    },
  });
}
