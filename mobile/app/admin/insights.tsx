import { useCallback, useRef } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { AdminHeader } from "@/components/AdminHeader";
import { AnalyticsSection } from "@/components/mypage/AnalyticsSection";
import { colors, TAB_BAR_SPACE } from "@/theme";

// Insights — today's numbers, combo suggestions and (Premium) sales
// insights + report. Formerly My Page > Analytics.
export default function AdminInsights() {
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Insights" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <AnalyticsSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: TAB_BAR_SPACE, gap: 16 },
});
