import { useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  is_featured: boolean;
  description: string | null;
  ingredients: string | null;
  allergy_info: string | null;
  cook_time_minutes: number | null;
};

// A rough, local approximation of the real customer ordering UI — not the
// real /order/[qrToken] page itself (that needs EXPO_PUBLIC_WEB_ORIGIN,
// which isn't set until there's a real domain — see the Preview tab), but
// the same interaction and tone as the selected menu design
// (Terracotta/Heritage/Nordic — src/lib/menu-templates.ts): featured items
// in a horizontal row, categories as horizontal-scrolling rows of cards
// with photos always visible (no accordion), tap a card for a full-screen
// detail view, a floating "Review Order" bar that opens an order review
// sheet. None of this places a real order — "Send Order" just confirms the
// preview closed — and unavailable items are left out, same as the real
// order page.
export function MenuPreviewModal({
  visible,
  onClose,
  categories,
  items,
  menuTemplate,
  subtitle,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  items: Item[];
  menuTemplate: MobileMenuTemplateId;
  // Sample-browsing mode (MenuSection's "pick a design" flow, sample data,
  // not the owner's real menu) passes both of these; the normal "preview my
  // real live menu" mode passes neither.
  subtitle?: string;
  onApply?: () => void;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const available = items.filter((i) => i.is_available);
  const featured = available.filter((i) => i.is_featured).slice(0, 3);
  const t = MOBILE_TEMPLATE_STYLES[menuTemplate];

  const cartLines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => ({ item: available.find((i) => i.id === itemId), quantity }))
    .filter((line): line is { item: Item; quantity: number } => !!line.item);
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);

  function setQty(itemId: string, quantity: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, quantity) }));
  }

  function close() {
    setCart({});
    setDetailItem(null);
    setCartOpen(false);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
      onDismiss={close}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: t.pageBackground }]} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={close} hitSlop={10}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>{onApply ? "Sample preview" : "Menu preview"}</Text>
            <Text style={styles.headerSubtitle}>
              {subtitle ?? "Roughly what customers see — not final styling"}
            </Text>
          </View>
          {onApply && (
            <TouchableOpacity style={[styles.applyButton, { backgroundColor: t.addButtonColor }]} onPress={onApply}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: cartCount > 0 ? 90 : 20 }]}>
          {featured.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredRow}>
              {featured.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.featuredCard}
                  activeOpacity={0.85}
                  onPress={() => setDetailItem(item)}
                >
                  {item.photo_url ? (
                    <Image source={{ uri: item.photo_url }} style={styles.featuredImage} />
                  ) : (
                    <View style={[styles.featuredImage, styles.featuredPlaceholder]}>
                      <Text style={styles.photoPlaceholder}>Menuko</Text>
                    </View>
                  )}
                  <View style={styles.featuredOverlay} />
                  <View style={[styles.featuredBadge, { backgroundColor: t.addButtonColor }]}>
                    <Text style={styles.featuredBadgeText}>Our Best!</Text>
                  </View>
                  <Text style={styles.featuredName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {categories.map((category) => {
            const categoryItems = available.filter((i) => i.category_id === category.id);
            if (categoryItems.length === 0) return null;
            return (
              <View key={category.id} style={styles.categorySection}>
                <Text
                  style={[
                    styles.categoryTitle,
                    { color: t.categoryLabelColor },
                    t.categoryLabelUppercase && styles.categoryTitleUppercase,
                    t.categoryLabelTracked && styles.categoryTitleTracked,
                    t.categoryUnderline && {
                      borderBottomWidth: 1.5,
                      borderBottomColor: t.categoryLabelColor,
                      paddingBottom: 2,
                    },
                    t.categoryLabelBackground && {
                      backgroundColor: t.categoryLabelBackground,
                      borderRadius: t.categoryLabelRadius,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      alignSelf: "flex-start",
                    },
                  ]}
                >
                  {category.name}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                  {categoryItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.rowCard,
                        {
                          backgroundColor: t.cardBackground,
                          borderColor: t.cardBorderColor,
                          borderWidth: t.cardBorderWidth,
                          borderRadius: t.cardBorderRadius,
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setDetailItem(item)}
                    >
                      <View
                        style={[
                          styles.rowCardPhoto,
                          {
                            backgroundColor: t.photoBackground,
                            borderTopLeftRadius: t.cardBorderRadius,
                            borderTopRightRadius: t.cardBorderRadius,
                          },
                        ]}
                      >
                        {item.photo_url ? (
                          <Image source={{ uri: item.photo_url }} style={styles.rowCardImage} />
                        ) : (
                          <Text style={styles.photoPlaceholder}>Menuko</Text>
                        )}
                      </View>
                      <View style={styles.rowCardTextWrap}>
                        <View style={[styles.rowCardPriceBadge, { backgroundColor: t.addButtonColor }]}>
                          <Text style={styles.rowCardPriceText}>{formatPeso(item.price)}</Text>
                        </View>
                        <Text style={[styles.rowCardName, { color: t.itemNameColor }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            );
          })}
          {available.length === 0 && (
            <Text style={styles.empty}>No available menu items yet.</Text>
          )}
        </ScrollView>

        {cartCount > 0 && !detailItem && !cartOpen && (
          <TouchableOpacity
            style={[styles.checkoutBar, { backgroundColor: t.addButtonColor }]}
            onPress={() => setCartOpen(true)}
          >
            <Text style={styles.checkoutBarText}>Review Order ({cartCount})</Text>
            <Text style={styles.checkoutBarText}>{formatPeso(cartTotal)}</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {detailItem && (
        <DetailOverlay
          item={detailItem}
          quantity={cart[detailItem.id] ?? 0}
          onChangeQty={(qty) => setQty(detailItem.id, qty)}
          onClose={() => setDetailItem(null)}
          canCheckout={cartCount > 0}
          onGoToCheckout={() => {
            setDetailItem(null);
            setCartOpen(true);
          }}
          t={t}
        />
      )}

      {cartOpen && (
        <CartSheet
          lines={cartLines}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onConfirm={() => {
            setCartOpen(false);
            Alert.alert("Preview only", "This is just a design preview — no real order is placed.");
          }}
          t={t}
        />
      )}
    </Modal>
  );
}

function DetailOverlay({
  item,
  quantity,
  onChangeQty,
  onClose,
  canCheckout,
  onGoToCheckout,
  t,
}: {
  item: Item;
  quantity: number;
  onChangeQty: (quantity: number) => void;
  onClose: () => void;
  canCheckout: boolean;
  onGoToCheckout: () => void;
  t: MobileTemplateStyle;
}) {
  return (
    <View style={[styles.overlay, { backgroundColor: t.cardBackground }]}>
      <View style={styles.overlayPhoto}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.overlayImage} />
        ) : (
          <View style={[styles.overlayImage, styles.featuredPlaceholder]}>
            <Text style={styles.photoPlaceholder}>Menuko</Text>
          </View>
        )}
        <TouchableOpacity style={styles.overlayBack} onPress={onClose}>
          <Text style={styles.overlayBackIcon}>←</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.overlayContent}>
        <Text style={styles.overlayName}>{item.name}</Text>
        <Text style={[styles.overlayPrice, { color: t.priceColor }]}>{formatPeso(item.price)}</Text>
        {item.description && <Text style={styles.overlayText}>{item.description}</Text>}
        {item.ingredients && (
          <Text style={styles.overlayText}>
            <Text style={styles.overlayLabel}>Ingredients: </Text>
            {item.ingredients}
          </Text>
        )}
        {item.allergy_info && (
          <Text style={styles.overlayText}>
            <Text style={styles.overlayLabel}>Allergy: </Text>
            {item.allergy_info}
          </Text>
        )}
        {item.cook_time_minutes && (
          <Text style={styles.overlayMeta}>🕐 {item.cook_time_minutes} min</Text>
        )}

        <View style={styles.overlayActions}>
          {quantity === 0 ? (
            <TouchableOpacity
              style={[styles.overlayAddButton, { backgroundColor: t.addButtonColor }]}
              onPress={() => onChangeQty(1)}
            >
              <Text style={styles.overlayAddButtonText}>Add to Order</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.overlayStepper}>
              <TouchableOpacity onPress={() => onChangeQty(quantity - 1)} style={styles.overlayStepperButton}>
                <Text style={styles.overlayStepperButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.overlayStepperCount}>{quantity}</Text>
              <TouchableOpacity onPress={() => onChangeQty(quantity + 1)} style={styles.overlayStepperButton}>
                <Text style={styles.overlayStepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
          {canCheckout && (
            <TouchableOpacity onPress={onGoToCheckout} style={styles.overlayCheckoutLink}>
              <Text style={styles.overlayCheckoutLinkText}>Review Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function CartSheet({
  lines,
  total,
  onClose,
  onConfirm,
  t,
}: {
  lines: { item: Item; quantity: number }[];
  total: number;
  onClose: () => void;
  onConfirm: () => void;
  t: MobileTemplateStyle;
}) {
  return (
    <View style={styles.sheetBackdrop}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.cardBackground }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Review your order</Text>
        {lines.map((line) => (
          <View key={line.item.id} style={styles.sheetLine}>
            <Text style={styles.sheetLineName} numberOfLines={1}>
              {line.item.name} × {line.quantity}
            </Text>
            <Text style={styles.sheetLinePrice}>{formatPeso(line.item.price * line.quantity)}</Text>
          </View>
        ))}
        <View style={styles.sheetTotalRow}>
          <Text style={styles.sheetTotalLabel}>Total</Text>
          <Text style={styles.sheetTotalValue}>{formatPeso(total)}</Text>
        </View>
        <TouchableOpacity style={[styles.sheetConfirm, { backgroundColor: t.addButtonColor }]} onPress={onConfirm}>
          <Text style={styles.sheetConfirmText}>Send Order</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sheetBack} onPress={onClose}>
          <Text style={styles.sheetBackText}>Back to menu</Text>
        </TouchableOpacity>
      </View>
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
  applyButton: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  applyButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  content: { padding: 16, gap: 18 },

  featuredRow: { flexGrow: 0 },
  featuredCard: {
    width: 180,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 10,
  },
  featuredImage: { ...StyleSheet.absoluteFill },
  featuredPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#eee" },
  featuredOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  featuredBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  featuredName: {
    position: "absolute",
    right: 10,
    bottom: 12,
    maxWidth: "55%",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },

  categorySection: { gap: 10 },
  categoryTitle: { fontSize: 13, fontWeight: "700" },
  categoryTitleUppercase: { textTransform: "uppercase" },
  categoryTitleTracked: { letterSpacing: 1.5 },
  categoryRow: { flexGrow: 0 },
  rowCard: { width: 132, marginRight: 10 },
  rowCardPhoto: {
    width: "100%",
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rowCardImage: { ...StyleSheet.absoluteFill },
  rowCardTextWrap: { position: "relative", paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8 },
  rowCardPriceBadge: {
    position: "absolute",
    top: -10,
    left: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  rowCardPriceText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  rowCardName: { fontSize: 12, fontWeight: "500", marginTop: 4 },
  photoPlaceholder: { fontSize: 10, color: "#8a7c68" },

  checkoutBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  checkoutBarText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },

  empty: { fontSize: 13, color: "#8a7c68", textAlign: "center", marginTop: 40 },

  overlay: { ...StyleSheet.absoluteFill },
  overlayPhoto: { width: "100%", height: 260, backgroundColor: "#eee" },
  overlayImage: { width: "100%", height: "100%" },
  overlayBack: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayBackIcon: { color: "#ffffff", fontSize: 18 },
  overlayContent: { padding: 20, gap: 8 },
  overlayName: { fontSize: 19, fontWeight: "700" },
  overlayPrice: { fontSize: 16, fontWeight: "600" },
  overlayText: { fontSize: 13, color: "#3c3327", lineHeight: 19 },
  overlayLabel: { fontWeight: "700" },
  overlayMeta: { fontSize: 12, color: "#8a7c68" },
  overlayActions: { marginTop: 24, alignItems: "center", gap: 10 },
  overlayAddButton: { width: "100%", paddingVertical: 14, borderRadius: 999, alignItems: "center" },
  overlayAddButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  overlayStepper: { flexDirection: "row", alignItems: "center", gap: 18 },
  overlayStepperButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#ece2d3",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayStepperButtonText: { fontSize: 17 },
  overlayStepperCount: { fontSize: 16, fontVariant: ["tabular-nums"], width: 22, textAlign: "center" },
  overlayCheckoutLink: { paddingVertical: 6 },
  overlayCheckoutLinkText: { fontSize: 13, color: "#8a7c68", textDecorationLine: "underline" },

  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 4 },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e0e0e0",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  sheetLine: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 4 },
  sheetLineName: { flex: 1, fontSize: 13 },
  sheetLinePrice: { fontSize: 13, fontVariant: ["tabular-nums"] },
  sheetTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#ece2d3",
    marginTop: 8,
    paddingTop: 10,
  },
  sheetTotalLabel: { fontSize: 14, fontWeight: "700" },
  sheetTotalValue: { fontSize: 14, fontWeight: "700" },
  sheetConfirm: { marginTop: 16, paddingVertical: 14, borderRadius: 999, alignItems: "center" },
  sheetConfirmText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  sheetBack: { marginTop: 8, paddingVertical: 6, alignItems: "center" },
  sheetBackText: { fontSize: 13, color: "#8a7c68", textDecorationLine: "underline" },
});
