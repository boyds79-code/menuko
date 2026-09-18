import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdminHeader } from "@/components/AdminHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { AnalyticsSection } from "@/components/mypage/AnalyticsSection";
import { AccountSection } from "@/components/mypage/AccountSection";

type Section = "analytics" | "account";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "analytics", label: "Analytics" },
  { key: "account", label: "Account" },
];

export default function MyPage() {
  const [section, setSection] = useState<Section>("analytics");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="My Page" showSignOut />
      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedControl options={SECTIONS} value={section} onChange={setSection} />
        {section === "analytics" ? <AnalyticsSection /> : <AccountSection />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffaf3" },
  content: { padding: 16, gap: 16 },
});
