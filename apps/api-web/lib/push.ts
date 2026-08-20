import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "./prisma";

const expo = new Expo();

// Push is deliberately narrow (spec: only 3 triggers exist — work approved, upgrade approved,
// weekly Full Member digest) so this stays a thin wrapper rather than a general notification
// pipeline. Invalid/stale tokens (uninstalled app, etc.) are pruned on send failure rather than
// left to accumulate forever.
//
// The whole body is wrapped so this can NEVER throw into its callers — every call site is a
// side effect of a core action (approving a work record, approving an upgrade) that must still
// succeed even if the push subsystem errors (e.g. Expo's API is down, or the PushToken table
// migration hasn't been applied to the database yet).
export async function sendPush(userId: string, title: string, body: string) {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({ to: t.token, sound: "default", title, body }));
    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    const staleTokens: string[] = [];

    for (const chunk of chunks) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        receipts.forEach((receipt, i) => {
          if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
            staleTokens.push(chunk[i].to as string);
          }
        });
      } catch (err) {
        console.error("Push send failed", err);
      }
    }

    if (staleTokens.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: staleTokens } } });
    }
  } catch (err) {
    console.error("sendPush failed", err);
  }
}
