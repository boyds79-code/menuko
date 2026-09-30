import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { AdminHeader } from "@/components/AdminHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { BusinessSection } from "@/components/settings/BusinessSection";
import { AccountSection } from "@/components/mypage/AccountSection";
import { colors, TAB_BAR_SPACE } from "@/theme";

// Store — everything about the business and this login: business info,
// staff accounts, payment, delivery channels, tables & QR (BusinessSection)
// and the owner's own email/password/delete (AccountSection). Merges the
// old Settings > My Business and My Page > Account.
type Section = "business" | "account";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "business", label: "My Business" },
  { key: "account", label: "Account" },
];

export default function AdminStore() {
  const [section, setSection] = useState<Section>("business");
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Store" showSignOut />
      <View style={styles.switcherBar}>
        <SegmentedControl options={SECTIONS} value={section} onChange={setSection} />
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {section === "business" ? <BusinessSection /> : <AccountSection />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  switcherBar: { paddingHorizontal: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: TAB_BAR_SPACE, gap: 16 },
});
