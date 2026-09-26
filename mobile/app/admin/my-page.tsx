import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { AdminHeader } from "@/components/AdminHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { AnalyticsSection } from "@/components/mypage/AnalyticsSection";
import { AccountSection } from "@/components/mypage/AccountSection";

type Section = "analytics" | "account";

const SECTIONS: { key: Section; label: string; badge?: string }[] = [
  { key: "account", label: "Account" },
  { key: "analytics", label: "Analytics", badge: "Premium" },
];

export default function MyPage() {
  const [section, setSection] = useState<Section>("account");
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="My Page" showSignOut />
      <View style={styles.switcherBar}>
        <SegmentedControl options={SECTIONS} value={section} onChange={setSection} />
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {section === "analytics" ? <AnalyticsSection /> : <AccountSection />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffaf3" },
  switcherBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#ece2d3",
  },
  content: { padding: 16, gap: 16 },
});
