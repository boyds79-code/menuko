import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { AdminHeader } from "@/components/AdminHeader";

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN;

// This tab is deliberately NOT an editor — it's a live preview of the
// exact page a customer sees after scanning a table's QR code (the real
// /order/[qrToken] web page, loaded in a WebView, not a re-implementation
// of its styling in React Native). Menu editing moved to Settings > Menu.
export default function AdminMenuPreview() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [qrToken, setQrToken] = useState<string | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("tables")
      .select("qr_token")
      .eq("restaurant_id", restaurantId)
      .eq("is_virtual", false)
      .order("label")
      .limit(1)
      .maybeSingle();
    setQrToken(data?.qr_token ?? null);
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const orderUrl = WEB_ORIGIN && qrToken ? `${WEB_ORIGIN}/order/${qrToken}` : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Preview" />
      {qrToken === undefined ? (
        <ActivityIndicator style={styles.centered} color="#ea7c1f" />
      ) : orderUrl ? (
        <WebView source={{ uri: orderUrl }} style={styles.webview} />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.hintTitle}>
            {qrToken === null ? "Add a table first" : "Set EXPO_PUBLIC_WEB_ORIGIN"}
          </Text>
          <Text style={styles.hint}>
            {qrToken === null
              ? "This preview shows the real customer menu for one of your tables — add a table in Settings > Tables first."
              : "This preview loads the real customer order page, so it needs to know where the web app is deployed."}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffaf3" },
  webview: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  hintTitle: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 12, color: "#8a7c68", textAlign: "center", lineHeight: 17 },
});
