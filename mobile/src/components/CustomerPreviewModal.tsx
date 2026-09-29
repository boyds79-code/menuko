import { Modal, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ModalHeader } from "@/components/ModalHeader";
import { WebView } from "react-native-webview";

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN;

// The exact real customer order page for one table, loaded live — not a
// mockup (see the Menu tab, which shows the same thing for the browsing
// experience specifically; this is the same idea, reachable from Tables
// so an owner can pick a table already in front of them).
export function CustomerPreviewModal({
  visible,
  onClose,
  qrToken,
}: {
  visible: boolean;
  onClose: () => void;
  qrToken: string | null;
}) {
  const orderUrl = WEB_ORIGIN && qrToken ? `${WEB_ORIGIN}/order/${qrToken}` : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ModalHeader title="Customer view" subtitle="The real order page — live, not a mockup" onBack={onClose} />
        {orderUrl ? (
          <WebView source={{ uri: orderUrl }} style={styles.webview} />
        ) : (
          <View style={styles.centered}>
            <Text style={styles.hintTitle}>
              {qrToken ? "Set EXPO_PUBLIC_WEB_ORIGIN" : "Add a table first"}
            </Text>
            <Text style={styles.hint}>
              {qrToken
                ? "This needs to know where the web app is deployed to load the real order page."
                : "Add a table in Store > Tables & QR codes to preview its order page."}
            </Text>
          </View>
        )}
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F2F4EE" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E6DC",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { fontSize: 16, color: "#15261E", fontWeight: "700" },
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  headerSubtitle: { fontSize: 11, color: "#55645B", marginTop: 1 },
  webview: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  hintTitle: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 12, color: "#55645B", textAlign: "center", lineHeight: 17 },
});
