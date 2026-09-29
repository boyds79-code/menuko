import { useEffect, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { NewOrderForm } from "@/components/NewOrderForm";
import { colors, fonts } from "@/theme";

type Category = { id: string; name: string; sort_order: number };
type MenuItem = { id: string; category_id: string | null; name: string; price: number };

// Bottom sheet behind the owner tab bar's "+" button — the same manual
// delivery/takeout order form the cashier screen shows inline (dine-in
// orders keep coming from the table QR, so there's no dine-in option here).
export function NewOrderSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [slide] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!visible || !restaurantId) return;
    supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
    supabase
      .from("menu_items")
      .select("id, category_id, name, price")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("sort_order")
      .then(({ data }) => setItems(data ?? []));
  }, [visible, restaurantId]);

  useEffect(() => {
    if (!visible) return;
    slide.setValue(1);
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 190 }).start();
  }, [visible, slide]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 700] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12, transform: [{ translateY }] }]}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>New order</Text>
            <Text style={styles.subtitle}>Delivery or takeout. Dine-in orders come in from the table QR.</Text>
            {visible && <NewOrderForm categories={categories} items={items} onDone={onClose} />}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(12,20,16,0.45)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 6,
    maxHeight: 640,
  },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  subtitle: { fontSize: 13, color: colors.muted, marginBottom: 8 },
});
