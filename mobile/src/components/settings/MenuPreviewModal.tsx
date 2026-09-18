import { useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatPeso } from "@/lib/money";
import { MOBILE_TEMPLATE_STYLES, type MobileMenuTemplateId, type MobileTemplateStyle } from "@/lib/menu-templates";

type Category = { id: string; name: string; sort_order: number };
type Item = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  photo_url: string | null;
  is_available: boolean;
  description: string | null;
  ingredients: string | null;
  allergy_info: string | null;
  cook_time_minutes: number | null;
};

// A rough, local approximation of the real customer ordering UI — not the
// real /order/[qrToken] page itself (that needs EXPO_PUBLIC_WEB_ORIGIN,
// which isn't set until there's a real domain — see the Menu tab), but the
// same interaction and the same tone as the selected menu design
// (Classic/Warm/Minimal — src/lib/menu-templates.ts): categories collapsed
// to a list, tap one to expand it (only one open at a time); tap an item
// to expand its description/ingredients/allergy/cook time; an Add button
// that turns into a −/count/+ stepper. None of this places a real order,
// and unavailable items are left out entirely, same as the real order page
// (src/app/order/[qrToken]/page.tsx filters is_available).
export function MenuPreviewModal({
  visible,
  onClose,
  categories,
  items,
  menuTemplate,
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  items: Item[];
  menuTemplate: MobileMenuTemplateId;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const available = items.filter((i) => i.is_available);
  const t = MOBILE_TEMPLATE_STYLES[menuTemplate];

  function setQty(itemId: string, quantity: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, quantity) }));
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: t.pageBackground }]} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Menu preview</Text>
            <Text style={styles.headerSubtitle}>Roughly what customers see — not final styling</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {categories.map((category) => {
            const categoryItems = available.filter((i) => i.category_id === category.id);
            if (categoryItems.length === 0) return null;
            const isOpen = openCategoryId === category.id;
            return (
              <View
                key={category.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: t.cardBackground,
                    borderColor: t.cardBorderColor,
                    borderWidth: t.cardBorderWidth,
                    borderRadius: t.cardBorderRadius,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => setOpenCategoryId(isOpen ? null : category.id)}
                >
                  <Text
                    style={[
                      styles.categoryTitle,
                      { color: t.categoryLabelColor },
                      t.categoryLabelUppercase && styles.categoryTitleUppercase,
                      t.categoryLabelTracked && styles.categoryTitleTracked,
                      t.categoryUnderline && { borderBottomWidth: 1.5, borderBottomColor: t.categoryLabelColor, paddingBottom: 2 },
                      t.categoryLabelBackground && {
                        backgroundColor: t.categoryLabelBackground,
                        borderRadius: t.categoryLabelRadius,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                      },
                    ]}
                  >
                    {category.name}
                  </Text>
                  <Text style={[styles.chevron, isOpen && styles.chevronOpen]}>⌄</Text>
                </TouchableOpacity>
                {isOpen && (
                  <View style={styles.categoryBody}>
                    {categoryItems.map((item) => (
                      <PreviewRow
                        key={item.id}
                        item={item}
                        quantity={cart[item.id] ?? 0}
                        onChange={(qty) => setQty(item.id, qty)}
                        t={t}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          {available.length === 0 && (
            <Text style={styles.empty}>No available menu items yet.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PreviewRow({
  item,
  quantity,
  onChange,
  t,
}: {
  item: Item;
  quantity: number;
  onChange: (quantity: number) => void;
  t: MobileTemplateStyle;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!(
    item.description ||
    item.ingredients ||
    item.allergy_info ||
    item.cook_time_minutes
  );

  return (
    <View>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: t.pageBackground }]}
        activeOpacity={hasDetails ? 0.6 : 1}
        onPress={() => hasDetails && setExpanded((e) => !e)}
      >
        <View
          style={[
            styles.photoBox,
            { backgroundColor: t.photoBackground, borderRadius: t.photoShape },
          ]}
        >
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={[styles.photoImage, { borderRadius: t.photoShape }]} />
          ) : (
            <Text style={styles.photoPlaceholder}>Menuko</Text>
          )}
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.itemName, { color: t.itemNameColor }]}>{item.name}</Text>
          <Text style={[styles.itemPrice, { color: t.priceColor }]}>{formatPeso(item.price)}</Text>
        </View>
        {quantity === 0 ? (
          <TouchableOpacity
            onPress={() => onChange(1)}
            style={[
              styles.addButton,
              { borderRadius: t.addButtonRadius, borderColor: t.addButtonColor },
              t.addButtonFilled && { backgroundColor: t.addButtonColor },
            ]}
          >
            <Text style={[styles.addButtonText, { color: t.addButtonFilled ? "#ffffff" : t.addButtonColor }]}>
              Add
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => onChange(quantity - 1)} style={styles.stepperButton}>
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperCount}>{quantity}</Text>
            <TouchableOpacity onPress={() => onChange(quantity + 1)} style={styles.stepperButton}>
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
      {expanded && hasDetails && (
        <View style={[styles.detailsBox, { backgroundColor: t.pageBackground }]}>
          {item.description && <Text style={styles.detailsText}>{item.description}</Text>}
          {item.ingredients && (
            <Text style={styles.detailsText}>
              <Text style={styles.detailsLabel}>Ingredients: </Text>
              {item.ingredients}
            </Text>
          )}
          {item.allergy_info && (
            <Text style={styles.detailsText}>
              <Text style={styles.detailsLabel}>Allergy: </Text>
              {item.allergy_info}
            </Text>
          )}
          {item.cook_time_minutes && (
            <Text style={styles.detailsMeta}>🕐 {item.cook_time_minutes} min</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#ece2d3",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { fontSize: 16, color: "#231f1a", fontWeight: "700" },
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  headerSubtitle: { fontSize: 11, color: "#8a7c68", marginTop: 1 },
  content: { padding: 16, gap: 10 },
  categoryCard: {},
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  categoryTitle: { fontSize: 15, fontWeight: "700" },
  categoryTitleUppercase: { textTransform: "uppercase" },
  categoryTitleTracked: { letterSpacing: 1.5 },
  chevron: { fontSize: 14, color: "#8a7c68" },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  categoryBody: { gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
  },
  photoBox: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImage: { width: "100%", height: "100%" },
  photoPlaceholder: { fontSize: 10, color: "#8a7c68" },
  rowText: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemPrice: { fontSize: 13, marginTop: 2 },
  addButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addButtonText: { fontWeight: "700", fontSize: 13 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ece2d3",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: { fontSize: 15, color: "#231f1a" },
  stepperCount: { fontSize: 14, fontWeight: "600", width: 16, textAlign: "center" },
  detailsBox: {
    marginTop: -4,
    marginBottom: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  detailsText: { fontSize: 12, color: "#3c3327", lineHeight: 17 },
  detailsLabel: { fontWeight: "700" },
  detailsMeta: { fontSize: 11, color: "#8a7c68" },
  empty: { fontSize: 13, color: "#8a7c68", textAlign: "center", marginTop: 40 },
});
