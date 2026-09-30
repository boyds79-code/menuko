import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/tabs";
import { colors, TAB_BAR_HEIGHT } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Owner tab bar: a floating pill with a sliding highlight behind the active
// tab and a raised "+" (new order) in the middle slot. Built only on RN's
// Animated API — no Reanimated/haptics — so it ships over EAS Update
// without a new store build.
const TABS: { name: string; label: string; icon: IconName; activeIcon: IconName; slot: number }[] = [
  { name: "index", label: "Floor", icon: "grid-outline", activeIcon: "grid", slot: 0 },
  { name: "menu", label: "Menu", icon: "book-outline", activeIcon: "book", slot: 1 },
  { name: "insights", label: "Insights", icon: "bar-chart-outline", activeIcon: "bar-chart", slot: 3 },
  { name: "store", label: "Store", icon: "storefront-outline", activeIcon: "storefront", slot: 4 },
];
const SLOTS = 5;
const INDICATOR_W = 60;

export function TabBar({ state, navigation, insets, onNewOrder }: BottomTabBarProps & { onNewOrder: () => void }) {
  const currentName = state.routes[state.index]?.name;
  const currentTab = TABS.find((t) => t.name === currentName);
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pos] = useState(() => new Animated.Value(currentTab?.slot ?? 0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!currentTab) return;
    if (reduceMotion) {
      pos.setValue(currentTab.slot);
      return;
    }
    Animated.spring(pos, {
      toValue: currentTab.slot,
      useNativeDriver: true,
      damping: 15,
      stiffness: 170,
      mass: 0.9,
    }).start();
  }, [currentTab, reduceMotion, pos]);

  // Pushed screens that live in this navigator (e.g. Revenue) cover the
  // whole screen, so the bar steps aside for them.
  if (!currentTab) return null;

  const slotW = width / SLOTS;
  const translateX = Animated.add(Animated.multiply(pos, slotW), (slotW - INDICATOR_W) / 2);

  function go(name: string) {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (currentName !== name && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {width > 0 && <Animated.View style={[styles.indicator, { transform: [{ translateX }] }]} />}
        {Array.from({ length: SLOTS }, (_, slot) => {
          if (slot === 2) {
            return (
              <View key="new" style={styles.slot}>
                <Pressable
                  onPress={onNewOrder}
                  accessibilityRole="button"
                  accessibilityLabel="New delivery or takeout order"
                  style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
                >
                  <Ionicons name="add" size={30} color={colors.ink} />
                </Pressable>
              </View>
            );
          }
          const tab = TABS.find((t) => t.slot === slot)!;
          const active = tab.name === currentName;
          return (
            <Pressable
              key={tab.name}
              onPress={() => go(tab.name)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              style={styles.slot}
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={active ? colors.onAccent : colors.muted}
              />
              <Text style={[styles.label, { color: active ? colors.onAccent : colors.muted }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16 },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  indicator: {
    position: "absolute",
    left: 0,
    top: (TAB_BAR_HEIGHT - 2 - 52) / 2,
    width: INDICATOR_W,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
  },
  slot: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", gap: 2 },
  label: { fontSize: 10.5, fontWeight: "700" },
  fab: {
    width: 58,
    height: 58,
    marginTop: -30,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: colors.bg,
    backgroundColor: colors.saffron,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabPressed: { transform: [{ scale: 0.92 }] },
});
