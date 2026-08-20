import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiFetch } from "../api/client";

// Called once per app session after login — registers this device for the 3 narrow push
// triggers the backend sends (work approved, upgrade approved, weekly Full Member digest).
// Silently no-ops on simulators/emulators and when the user declines the permission prompt;
// push is a nice-to-have here, never something that should block or error the login flow.
export async function registerPushToken() {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await apiFetch("/api/push-tokens", { method: "POST", body: JSON.stringify({ token }) });
  } catch {
    // Best-effort — never let a push registration failure surface to the user.
  }
}
