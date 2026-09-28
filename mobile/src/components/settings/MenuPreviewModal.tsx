import { useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatPeso } from "@/lib/money";
import { resolveMobilePalette, type MobileMenuColorId, type MobileMenuLayoutId, type MobileColorPalette } from "@/lib/menu-templates";

type Category = { id: string; name: string; sort_order: number; parent_id: string | null };
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
// the same interaction and tone as the selected menu design (Classic vs.
// Minimal List layout, Terracotta/Heritage/Nordic/Botanical color — see
// src/lib/menu-templates.ts and the web order-client.tsx it mirrors): tap a
// card for a full-screen detail view, a floating "Review Order" bar that
// opens an order review sheet. None of this places a real order — "Send
// Order" just confirms the preview closed — and unavailable items are left
// out, same as the real order page.
export function MenuPreviewModal({
  visible,
  onClose,
  categories,
  items,
  menuLayout,
  menuColor,
  subtitle,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  items: Item[];
  menuLayout: MobileMenuLayoutId;
  menuColor: MobileMenuColorId;
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
  const p = resolveMobilePalette(menuLayout, menuColor);

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
      <SafeAreaView style={[styles.safe, { backgroundColor: p.pageBackground }]} edges={["top", "bottom"]}>
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
            <TouchableOpacity style={[styles.applyButton, { backgroundColor: p.brand }]} onPress={onApply}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          )}
        </View>

        {menuLayout === "minimal-list" ? (
          <MinimalListMenu categories={categories} available={available} featured={featured} p={p} cartCount={cartCount} onOpenItem={setDetailItem} />
        ) : menuLayout === "jamezz-dark" ? (
          <JamezzDarkMenu categories={categories} available={available} p={p} cartCount={cartCount} onOpenItem={setDetailItem} />
        ) : (
          <ClassicMenu categories={categories} available={available} featured={featured} p={p} cartCount={cartCount} onOpenItem={setDetailItem} />
        )}

        {cartCount > 0 && !detailItem && !cartOpen && (
          <TouchableOpacity
            style={[styles.checkoutBar, { backgroundColor: p.brand }]}
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
          p={p}
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
          p={p}
        />
      )}
    </Modal>
  );
}

type MenuBodyProps = {
  categories: Category[];
  available: Item[];
  featured: Item[];
  p: MobileColorPalette;
  cartCount: number;
  onOpenItem: (item: Item) => void;
};

// Menuko's original shape: featured items in a horizontal row, categories
// as horizontal-scrolling rows of rounded cards with photos always visible
// (no accordion) — mirrors ClassicLayout/RowCard in the web order-client.tsx.
function ClassicMenu({ categories, available, featured, p, cartCount, onOpenItem }: MenuBodyProps) {
  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: cartCount > 0 ? 90 : 20 }]}>
      {featured.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredRow}>
          {featured.map((item) => (
            <TouchableOpacity key={item.id} style={styles.featuredCard} activeOpacity={0.85} onPress={() => onOpenItem(item)}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.featuredImage} />
              ) : (
                <View style={[styles.featuredImage, styles.featuredPlaceholder]}>
                  <Text style={styles.photoPlaceholder}>Menuko</Text>
                </View>
              )}
              <View style={styles.featuredOverlay} />
              <View style={[styles.featuredBadge, { backgroundColor: p.brand }]}>
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
            <Text style={[styles.categoryPillLabel, { backgroundColor: `${p.brand}26`, color: p.brand }]}>{category.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {categoryItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.rowCard, { backgroundColor: p.cardBackground, borderColor: p.cardBorderColor }]}
                  activeOpacity={0.8}
                  onPress={() => onOpenItem(item)}
                >
                  <View style={styles.rowCardPhoto}>
                    {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.rowCardImage} /> : <Text style={styles.photoPlaceholder}>Menuko</Text>}
                  </View>
                  <View style={styles.rowCardTextWrap}>
                    <View style={[styles.rowCardPriceBadge, { backgroundColor: p.brand }]}>
                      <Text style={styles.rowCardPriceText}>{formatPeso(item.price)}</Text>
                    </View>
                    <Text style={[styles.rowCardName, { color: p.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      })}
      {available.length === 0 && <Text style={styles.empty}>No available menu items yet.</Text>}
    </ScrollView>
  );
}

// Benchmarked against a PosBytz-style menu: one promo banner from the
// owner's "Our Best" picks, then a flat list of item rows per category —
// mirrors MinimalListLayout in the web order-client.tsx.
function MinimalListMenu({ categories, available, featured, p, cartCount, onOpenItem }: MenuBodyProps) {
  const promoItem = featured[0] ?? null;
  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: cartCount > 0 ? 90 : 20 }]}>
      {promoItem && (
        <TouchableOpacity style={styles.promoBanner} activeOpacity={0.85} onPress={() => onOpenItem(promoItem)}>
          {promoItem.photo_url ? (
            <Image source={{ uri: promoItem.photo_url }} style={styles.featuredImage} />
          ) : (
            <View style={[styles.featuredImage, styles.featuredPlaceholder]}>
              <Text style={styles.photoPlaceholder}>Menuko</Text>
            </View>
          )}
          <View style={styles.featuredOverlay} />
          <View style={[styles.featuredBadge, { backgroundColor: p.brand }]}>
            <Text style={styles.featuredBadgeText}>Our Best!</Text>
          </View>
          <Text style={styles.promoBannerName} numberOfLines={1}>
            {promoItem.name}
          </Text>
        </TouchableOpacity>
      )}

      {categories.map((category) => {
        const categoryItems = available.filter((i) => i.category_id === category.id);
        if (categoryItems.length === 0) return null;
        return (
          <View key={category.id} style={styles.categorySection}>
            <Text style={styles.categoryFlatLabel}>{category.name}</Text>
            <View style={[styles.listGroup, { borderColor: p.cardBorderColor, backgroundColor: p.cardBackground }]}>
              {categoryItems.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.listRow, idx > 0 && { borderTopWidth: 1, borderTopColor: p.cardBorderColor }]}
                  activeOpacity={0.7}
                  onPress={() => onOpenItem(item)}
                >
                  <View style={styles.listRowPhoto}>
                    {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.listRowImage} /> : null}
                  </View>
                  <View style={styles.listRowTextWrap}>
                    <Text style={[styles.listRowName, { color: p.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text style={styles.listRowDescription} numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                    <Text style={[styles.listRowPrice, { color: p.brand }]}>{formatPeso(item.price)}</Text>
                  </View>
                  <View style={[styles.listRowAddChip, { backgroundColor: `${p.brand}1a` }]}>
                    <Text style={[styles.listRowAddChipText, { color: p.brand }]}>+</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
      {available.length === 0 && <Text style={styles.empty}>No available menu items yet.</Text>}
    </ScrollView>
  );
}

// Benchmarked against a Jamezz-style dark menu: major-category tabs ->
// subcategory pill filter -> the active subcategory's own "Our Best" hero
// -> a flat item list below — mirrors JamezzDarkLayout in the web
// order-client.tsx. A major category with no subcategories is treated as
// its own leaf, so a flat menu still works.
function JamezzDarkMenu({ categories, available, p, cartCount, onOpenItem }: Omit<MenuBodyProps, "featured">) {
  const categoryIdsWithItems = new Set(available.map((i) => i.category_id));
  const majors = categories.filter((c) => {
    if (c.parent_id) return false;
    const children = categories.filter((child) => child.parent_id === c.id);
    return children.length > 0 ? children.some((child) => categoryIdsWithItems.has(child.id)) : categoryIdsWithItems.has(c.id);
  });
  const [activeMajorId, setActiveMajorId] = useState<string | null>(majors[0]?.id ?? null);
  const resolvedActiveMajorId = majors.some((m) => m.id === activeMajorId) ? activeMajorId : (majors[0]?.id ?? null);
  const activeMajor = majors.find((m) => m.id === resolvedActiveMajorId) ?? null;

  const subs = activeMajor ? categories.filter((c) => c.parent_id === activeMajor.id && categoryIdsWithItems.has(c.id)) : [];
  const leafOptions = subs.length > 0 ? subs : activeMajor ? [activeMajor] : [];
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const resolvedActiveLeafId = leafOptions.some((l) => l.id === activeLeafId) ? activeLeafId : (leafOptions[0]?.id ?? null);

  const leafItems = resolvedActiveLeafId ? available.filter((i) => i.category_id === resolvedActiveLeafId) : [];
  const heroItem = leafItems.find((i) => i.is_featured) ?? null;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: cartCount > 0 ? 90 : 20 }]}>
      {majors.length > 0 && (
        <View style={styles.jamezzMajorRow}>
          {majors.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => {
                setActiveMajorId(m.id);
                setActiveLeafId(null);
              }}
            >
              <Text style={[styles.jamezzMajorLabel, { color: m.id === resolvedActiveMajorId ? p.brand : "#8a8a8a" }]}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {subs.length > 0 && (
        <View style={styles.jamezzSubRow}>
          {subs.map((s) => {
            const active = s.id === resolvedActiveLeafId;
            return (
              <TouchableOpacity key={s.id} onPress={() => setActiveLeafId(s.id)}>
                <Text style={[styles.jamezzSubChip, active ? { backgroundColor: p.brand, color: "#ffffff" } : { borderWidth: 1, borderColor: p.cardBorderColor, color: "#8a8a8a" }]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {heroItem && (
        <TouchableOpacity style={styles.jamezzHero} activeOpacity={0.85} onPress={() => onOpenItem(heroItem)}>
          {heroItem.photo_url ? (
            <Image source={{ uri: heroItem.photo_url }} style={styles.featuredImage} />
          ) : (
            <View style={[styles.featuredImage, styles.featuredPlaceholder]}>
              <Text style={styles.photoPlaceholder}>Menuko</Text>
            </View>
          )}
          <View style={styles.featuredOverlay} />
          <View style={[styles.featuredBadge, { backgroundColor: p.brand }]}>
            <Text style={styles.featuredBadgeText}>Our Best!</Text>
          </View>
          <Text style={styles.promoBannerName} numberOfLines={1}>
            {heroItem.name}
          </Text>
        </TouchableOpacity>
      )}
      <View style={[styles.listGroup, { borderColor: p.cardBorderColor, backgroundColor: p.cardBackground }]}>
        {leafItems.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.listRow, idx > 0 && { borderTopWidth: 1, borderTopColor: p.cardBorderColor }]}
            activeOpacity={0.7}
            onPress={() => onOpenItem(item)}
          >
            <View style={styles.listRowPhoto}>
              {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.listRowImage} /> : null}
            </View>
            <View style={styles.listRowTextWrap}>
              <Text style={[styles.listRowName, { color: p.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description && (
                <Text style={styles.listRowDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
              <Text style={[styles.listRowPrice, { color: p.brand }]}>{formatPeso(item.price)}</Text>
            </View>
            <View style={[styles.listRowAddChip, { backgroundColor: `${p.brand}33` }]}>
              <Text style={[styles.listRowAddChipText, { color: p.brand }]}>+</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {available.length === 0 && <Text style={styles.empty}>No available menu items yet.</Text>}
    </ScrollView>
  );
}

function DetailOverlay({
  item,
  quantity,
  onChangeQty,
  onClose,
  canCheckout,
  onGoToCheckout,
  p,
}: {
  item: Item;
  quantity: number;
  onChangeQty: (quantity: number) => void;
  onClose: () => void;
  canCheckout: boolean;
  onGoToCheckout: () => void;
  p: MobileColorPalette;
}) {
  return (
    <View style={[styles.overlay, { backgroundColor: p.cardBackground }]}>
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
        <Text style={[styles.overlayPrice, { color: p.brand }]}>{formatPeso(item.price)}</Text>
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
              style={[styles.overlayAddButton, { backgroundColor: p.brand }]}
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
  p,
}: {
  lines: { item: Item; quantity: number }[];
  total: number;
  onClose: () => void;
  onConfirm: () => void;
  p: MobileColorPalette;
}) {
  return (
    <View style={styles.sheetBackdrop}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: p.cardBackground }]}>
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
        <TouchableOpacity style={[styles.sheetConfirm, { backgroundColor: p.brand }]} onPress={onConfirm}>
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

  featuredRow: { flexGrow: 0, height: 120 },
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

  promoBanner: { height: 120, borderRadius: 16, overflow: "hidden" },
  promoBannerName: {
    position: "absolute",
    left: 10,
    bottom: 12,
    maxWidth: "70%",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },

  jamezzMajorRow: { flexDirection: "row", gap: 20, marginBottom: 12 },
  jamezzMajorLabel: { fontSize: 14, fontWeight: "700" },
  jamezzSubRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  jamezzSubChip: { fontSize: 11, fontWeight: "600", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, overflow: "hidden" },
  jamezzHero: { height: 150, borderRadius: 16, overflow: "hidden", marginBottom: 14 },

  categorySection: { gap: 10 },
  categoryPillLabel: {
    alignSelf: "flex-start",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryFlatLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  categoryRow: { flexGrow: 0 },
  rowCard: { width: 132, marginRight: 10, borderWidth: 1, borderRadius: 16, overflow: "visible" },
  rowCardPhoto: {
    width: "100%",
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#f2ede6",
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

  listGroup: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  listRowPhoto: { width: 48, height: 48, borderRadius: 8, overflow: "hidden", backgroundColor: "#f2ede6" },
  listRowImage: { width: "100%", height: "100%" },
  listRowTextWrap: { flex: 1, gap: 1 },
  listRowName: { fontSize: 13, fontWeight: "600" },
  listRowDescription: { fontSize: 11, color: "#8a7c68" },
  listRowPrice: { fontSize: 12, fontWeight: "700", marginTop: 1 },
  listRowAddChip: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listRowAddChipText: { fontSize: 13, fontWeight: "700" },

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
