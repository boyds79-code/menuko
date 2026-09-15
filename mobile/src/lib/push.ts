import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

// Foreground notifications still show a banner/sound (default in newer
// expo-notifications is to NOT show anything unless you set a handler).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Requests permission, gets an Expo push token, and upserts it onto this
// account's device_push_tokens row so the notify-order-event Edge Function
// can find it. Call once after sign-in. Silently no-ops on failure (e.g. a
// simulator, or no eas projectId configured yet via `eas init`) — push is
// an enhancement, not something that should block the rest of the app.
export async function registerForPushNotifications(accountId: string): Promise<void> {
  try {
    if (!Device.isDevice) return; // simulators/emulators can't get a real token

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("orders", {
        name: "주문 알림",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) {
      console.warn(
        "No EAS projectId configured — run `eas init` in mobile/ to enable push notifications.",
      );
      return;
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    await supabase
      .from("device_push_tokens")
      .upsert(
        { account_id: accountId, expo_push_token: expoPushToken },
        { onConflict: "account_id,expo_push_token" },
      );
  } catch (err) {
    console.warn("registerForPushNotifications failed", err);
  }
}
