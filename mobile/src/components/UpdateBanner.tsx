import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Updates from "expo-updates";

// How often a device that stays open all day (kitchen tablet, cashier
// phone) re-checks for a published EAS Update while in the foreground.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Over-the-air updates (EAS Update): new JS is downloaded quietly in the
// background — on launch (expo-updates' default), whenever the app comes
// back to the foreground, and every 30 min while open. It's never applied
// mid-shift on its own: once downloaded, this banner offers a one-tap
// restart, and otherwise it applies on the next cold start.
export function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    // Disabled in development (Expo Go / dev client) — nothing to check.
    if (!Updates.isEnabled) return;

    let checking = false;
    async function checkAndFetch() {
      if (checking) return;
      checking = true;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Offline or update server unreachable — try again next time.
      } finally {
        checking = false;
      }
    }

    const interval = setInterval(checkAndFetch, CHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") checkAndFetch();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  if (!isUpdatePending) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 12 }]}>
      <View style={styles.banner}>
        <Text style={styles.text}>A new version of Menuko is ready.</Text>
        <TouchableOpacity
          style={styles.button}
          disabled={restarting}
          onPress={async () => {
            setRestarting(true);
            try {
              await Updates.reloadAsync();
            } catch {
              setRestarting(false);
            }
          }}
        >
          <Text style={styles.buttonText}>{restarting ? "Restarting…" : "Restart"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, alignItems: "center" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#2A3A31",
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  text: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  button: { backgroundColor: "#1F5C45", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, minHeight: 44, justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
});
