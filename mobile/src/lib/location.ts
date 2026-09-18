import * as Location from "expo-location";

// "While using the app" only — no background/"Always" permission anywhere
// in this app. Used for two things: a periodic (every few minutes, only
// while the app is open) presence ping for owner accounts, and a one-off
// fresh read at the moment an owner taps approve/deny on a change request.
// The actual distance-to-restaurant check always happens server-side
// (supabase/migrations/0019_owner_geofence.sql) — this just gets a
// coordinate to send.
export async function getCurrentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status: existing } = await Location.getForegroundPermissionsAsync();
    let granted = existing === "granted";
    if (!granted) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      granted = status === "granted";
    }
    if (!granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}
