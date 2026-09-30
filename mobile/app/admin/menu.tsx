import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { AdminHeader } from "@/components/AdminHeader";
import { MenuSection } from "@/components/settings/MenuSection";
import { CustomerPreviewModal } from "@/components/CustomerPreviewModal";
import { colors, TAB_BAR_SPACE } from "@/theme";

// Menu — the menu editor (moved out of Settings into its own tab since it's
// the thing owners edit most) plus "Customer view", which replaced the old
// Preview tab: the real /order/[qrToken] page for the first table, live.
export default function AdminMenu() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;
  const scrollRef = useRef<ScrollView>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from("tables")
      .select("qr_token")
      .eq("restaurant_id", restaurantId)
      .eq("is_virtual", false)
      .order("label")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setQrToken(data?.qr_token ?? null));
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader
        title="Menu"
        right={
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setPreviewOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open customer view"
          >
            <Ionicons name="eye-outline" size={18} color={colors.ink} />
            <Text style={styles.previewText}>Customer view</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <MenuSection />
      </ScrollView>
      <CustomerPreviewModal visible={previewOpen} onClose={() => setPreviewOpen(false)} qrToken={qrToken} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: TAB_BAR_SPACE, gap: 16 },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginBottom: 2,
  },
  previewText: { fontSize: 13, fontWeight: "700", color: colors.ink },
});
