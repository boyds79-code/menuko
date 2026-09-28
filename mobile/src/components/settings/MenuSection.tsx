import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { pickAndUploadPhoto } from "@/lib/upload-photo";
import { MOBILE_MENU_LAYOUTS, MOBILE_MENU_COLORS, resolveMobilePalette, type MobileMenuLayoutId, type MobileMenuColorId } from "@/lib/menu-templates";
import { formatPeso } from "@/lib/money";
import { MenuPreviewModal } from "./MenuPreviewModal";
import { MenuImportModal } from "./MenuImportModal";

type Category = { id: string; name: string; sort_order: number; parent_id: string | null };
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
  is_featured: boolean;
  ingredient_cost: number | null;
};

const MAX_FEATURED_ITEMS = 3;

export function MenuSection() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const categoryInputRef = useRef<TextInput>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState<MobileMenuLayoutId>("classic");
  const [menuColor, setMenuColor] = useState<MobileMenuColorId>("terracotta");
  // The chips the owner has tapped to browse, which may not be applied yet —
  // stay equal to menuLayout/menuColor until they tap a different one. Only
  // "Apply" inside the preview modal actually writes menuLayout/menuColor.
  const [candidateLayout, setCandidateLayout] = useState<MobileMenuLayoutId>("classic");
  const [candidateColor, setCandidateColor] = useState<MobileMenuColorId>("terracotta");

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const [{ data: cats }, { data: itemRows }, { data: restaurant }] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, sort_order, parent_id")
        .eq("restaurant_id", restaurantId)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id, category_id, name, price, photo_url, is_available, description, ingredients, allergy_info, cook_time_minutes, is_featured, ingredient_cost",
        )
        .eq("restaurant_id", restaurantId)
        .order("sort_order"),
      supabase.from("restaurants").select("menu_layout, menu_color").eq("id", restaurantId).single(),
    ]);
    setCategories(cats ?? []);
    setItems(itemRows ?? []);
    if (restaurant?.menu_layout) {
      const applied = restaurant.menu_layout as MobileMenuLayoutId;
      setMenuLayout(applied);
      setCandidateLayout(applied);
    }
    if (restaurant?.menu_color) {
      const applied = restaurant.menu_color as MobileMenuColorId;
      setMenuColor(applied);
      setCandidateColor(applied);
    }
  }, [restaurantId]);

  async function applyMenuDesign(layout: MobileMenuLayoutId, color: MobileMenuColorId) {
    setMenuLayout(layout);
    setMenuColor(color);
    setCandidateLayout(layout);
    setCandidateColor(color);
    setPreviewOpen(false);
    if (!restaurantId) return;
    await supabase.from("restaurants").update({ menu_layout: layout, menu_color: color }).eq("id", restaurantId);
  }

  useEffect(() => {
    // Fetch-in-effect: setState only happens after the awaits inside
    // load(), not synchronously — same pattern as kitchen/cashier screens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function addCategory() {
    if (!newCategoryName.trim() || !restaurantId) return;
    // New categories go to the end of their own sibling group (same
    // parent_id) — mixing a subcategory's count with its major category's
    // would misorder both.
    const siblingCount = categories.filter((c) => c.parent_id === newCategoryParentId).length;
    await supabase.from("menu_categories").insert({
      restaurant_id: restaurantId,
      name: newCategoryName.trim(),
      parent_id: newCategoryParentId,
      sort_order: siblingCount,
    });
    setNewCategoryName("");
    setNewCategoryParentId(null);
    load();
  }

  async function renameCategory(id: string, name: string) {
    if (!name.trim()) return;
    await supabase.from("menu_categories").update({ name: name.trim() }).eq("id", id);
    load();
  }

  async function deleteCategory(id: string) {
    await supabase.from("menu_categories").delete().eq("id", id);
    load();
  }

  // Same "swap positions, then reindex everyone" logic as the web app's
  // moveCategory server action (src/app/admin/menu-actions.ts) — just run
  // client-side here since RLS already lets the owner write these rows
  // directly, no server action needed.
  async function moveCategory(categoryId: string, direction: "up" | "down") {
    // Only reorder among siblings (same parent_id) — a subcategory moving up
    // should never cross into its major category's own ordering.
    const self = categories.find((c) => c.id === categoryId);
    if (!self) return;
    const ids = categories.filter((c) => c.parent_id === self.parent_id).map((c) => c.id);
    const index = ids.indexOf(categoryId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= ids.length) return;
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await Promise.all(
      ids.map((id, i) => supabase.from("menu_categories").update({ sort_order: i }).eq("id", id)),
    );
    load();
  }

  async function addItem(categoryId: string | null, name: string, price: number, photoUrl: string | null) {
    if (!name.trim() || !(price >= 0) || !restaurantId) return;
    await supabase.from("menu_items").insert({
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: name.trim(),
      price,
      photo_url: photoUrl,
    });
    load();
  }

  async function updateItem(id: string, patch: Partial<Item>) {
    await supabase
      .from("menu_items")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.price !== undefined ? { price: patch.price } : {}),
        ...(patch.photo_url !== undefined ? { photo_url: patch.photo_url } : {}),
        ...(patch.is_available !== undefined ? { is_available: patch.is_available } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.ingredients !== undefined ? { ingredients: patch.ingredients } : {}),
        ...(patch.allergy_info !== undefined ? { allergy_info: patch.allergy_info } : {}),
        ...(patch.cook_time_minutes !== undefined ? { cook_time_minutes: patch.cook_time_minutes } : {}),
        ...(patch.is_featured !== undefined ? { is_featured: patch.is_featured } : {}),
        ...(patch.ingredient_cost !== undefined ? { ingredient_cost: patch.ingredient_cost } : {}),
      })
      .eq("id", id);
    load();
  }

  async function deleteItem(id: string) {
    await supabase.from("menu_items").delete().eq("id", id);
    load();
  }

  // "Our Best" is capped per category (not restaurant-wide) — a subcategory
  // like "Pizza" gets its own up-to-3 highlights independent of "Drinks".
  const featuredCountByCategory = new Map<string | null, number>();
  for (const item of items) {
    if (!item.is_featured) continue;
    featuredCountByCategory.set(item.category_id, (featuredCountByCategory.get(item.category_id) ?? 0) + 1);
  }

  function toggleFeatured(item: Item) {
    const featuredCount = featuredCountByCategory.get(item.category_id) ?? 0;
    if (!item.is_featured && featuredCount >= MAX_FEATURED_ITEMS) {
      Alert.alert(
        "Our Best is full",
        `Only ${MAX_FEATURED_ITEMS} items can be featured at once in this category — turn one off first.`,
      );
      return;
    }
    updateItem(item.id, { is_featured: !item.is_featured });
  }

  const uncategorized = items.filter((i) => i.category_id === null);
  const topLevelCategories = categories.filter((c) => !c.parent_id);
  const subcategoriesByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parent_id) continue;
    const list = subcategoriesByParent.get(c.parent_id) ?? [];
    list.push(c);
    subcategoriesByParent.set(c.parent_id, list);
  }

  return (
    <View style={styles.content}>
      <Text style={styles.featuredHint}>
        ⭐ marks up to {MAX_FEATURED_ITEMS} items per category shown as &ldquo;Our Best!&rdquo; on the customer menu.
      </Text>

      <Text style={styles.addMenuLabel}>Add your menu</Text>
      <View style={styles.addMenuRow}>
        {restaurantId && <MenuImportModal restaurantId={restaurantId} onImported={load} />}
        <TouchableOpacity
          style={styles.manualEntryButton}
          onPress={() => categoryInputRef.current?.focus()}
        >
          <Text style={styles.manualEntryButtonText}>Enter manually</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.addCategoryRow}>
        <TextInput
          ref={categoryInputRef}
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          placeholder="New category (e.g. Drinks, Mains)"
          placeholderTextColor="#8a7c68"
          style={styles.input}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={addCategory}>
          <Text style={styles.primaryButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      {topLevelCategories.length > 0 && (
        <View style={styles.parentPickerRow}>
          <TouchableOpacity
            onPress={() => setNewCategoryParentId(null)}
            style={[styles.parentChip, newCategoryParentId === null && styles.parentChipActive]}
          >
            <Text style={styles.parentChipText}>Top-level</Text>
          </TouchableOpacity>
          {topLevelCategories.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setNewCategoryParentId(c.id)}
              style={[styles.parentChip, newCategoryParentId === c.id && styles.parentChipActive]}
            >
              <Text style={styles.parentChipText}>Under &ldquo;{c.name}&rdquo;</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {topLevelCategories.map((category, index) => {
        const subcategories = subcategoriesByParent.get(category.id) ?? [];
        return (
          <View key={category.id} style={styles.categoryGroup}>
            <CategorySection
              category={category}
              items={items.filter((i) => i.category_id === category.id)}
              isFirst={index === 0}
              isLast={index === topLevelCategories.length - 1}
              onMove={(dir) => moveCategory(category.id, dir)}
              onRename={(name) => renameCategory(category.id, name)}
              onDelete={() => deleteCategory(category.id)}
              onAddItem={(name, price, photoUrl) => addItem(category.id, name, price, photoUrl)}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onToggleFeatured={toggleFeatured}
              restaurantId={restaurantId ?? ""}
              hasSubcategories={subcategories.length > 0}
            />
            {subcategories.length > 0 && (
              <View style={styles.subcategoryList}>
                {subcategories.map((sub, subIndex) => (
                  <CategorySection
                    key={sub.id}
                    category={sub}
                    items={items.filter((i) => i.category_id === sub.id)}
                    isFirst={subIndex === 0}
                    isLast={subIndex === subcategories.length - 1}
                    onMove={(dir) => moveCategory(sub.id, dir)}
                    onRename={(name) => renameCategory(sub.id, name)}
                    onDelete={() => deleteCategory(sub.id)}
                    onAddItem={(name, price, photoUrl) => addItem(sub.id, name, price, photoUrl)}
                    onUpdateItem={updateItem}
                    onDeleteItem={deleteItem}
                    onToggleFeatured={toggleFeatured}
                    restaurantId={restaurantId ?? ""}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}

      {uncategorized.length > 0 && (
        <CategorySection
          category={null}
          items={uncategorized}
          onAddItem={(name, price, photoUrl) => addItem(null, name, price, photoUrl)}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
          onToggleFeatured={toggleFeatured}
          restaurantId={restaurantId ?? ""}
        />
      )}

      <View style={styles.designCard}>
        <Text style={styles.designCardTitle}>Menu design</Text>
        <Text style={styles.designCardHint}>Applies to your customer-facing web menu.</Text>
        <Text style={styles.designAxisLabel}>Layout</Text>
        <View style={styles.templateRow}>
          {MOBILE_MENU_LAYOUTS.map((l) => (
            <TouchableOpacity
              key={l.id}
              onPress={() => setCandidateLayout(l.id)}
              style={[styles.templateChip, candidateLayout === l.id && styles.templateChipActive]}
            >
              <Text style={styles.templateChipText}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.designAxisLabel}>Color</Text>
        <View style={styles.templateRow}>
          {MOBILE_MENU_COLORS.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCandidateColor(c.id)}
              style={[styles.templateChip, candidateColor === c.id && styles.templateChipActive]}
            >
              <Text style={styles.templateChipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {candidateLayout === menuLayout && candidateColor === menuColor ? (
          <TouchableOpacity onPress={() => setPreviewOpen(true)} activeOpacity={0.85}>
            <MiniMenuPreview menuLayout={menuLayout} menuColor={menuColor} categories={categories} items={items} />
            <Text style={styles.swatchCaption}>This is your live design — tap to see the full preview →</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <PaletteCard menuLayout={candidateLayout} menuColor={candidateColor} />
            <Text style={styles.swatchCaption}>Not applied yet</Text>
            <TouchableOpacity style={styles.previewButton} onPress={() => setPreviewOpen(true)}>
              <Text style={styles.previewButtonText}>Preview this design</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Always the real menu, themed as candidateLayout/candidateColor —
          previewing a design should show the owner their own items in it,
          not a fake "Grilled Chicken Plate" mockup. Only offers Apply when
          browsing a design that isn't already applied. */}
      <MenuPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        categories={categories}
        items={items}
        menuLayout={candidateLayout}
        menuColor={candidateColor}
        onApply={
          candidateLayout !== menuLayout || candidateColor !== menuColor
            ? () => applyMenuDesign(candidateLayout, candidateColor)
            : undefined
        }
      />
    </View>
  );
}

// The color feel of a color identity being browsed (not yet applied) —
// plain labeled swatches rather than a fake menu, since there's nothing
// real to preview until the owner commits to it. Tapping it (see caller)
// opens the sample menu preview, where "Apply" actually commits the change.
function PaletteCard({ menuLayout, menuColor }: { menuLayout: MobileMenuLayoutId; menuColor: MobileMenuColorId }) {
  const p = resolveMobilePalette(menuLayout, menuColor);
  const swatches = [
    { label: "Brand", color: p.brand },
    { label: "Background", color: p.pageBackground },
    { label: "Card", color: p.cardBackground },
    { label: "Text", color: p.foreground },
  ];
  return (
    <View style={styles.paletteCard}>
      {swatches.map((s) => (
        <View key={s.label} style={styles.paletteSwatch}>
          <View style={[styles.paletteSwatchColor, { backgroundColor: s.color, borderColor: p.cardBorderColor }]} />
          <Text style={styles.paletteSwatchLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// A larger, real-data glance preview — up to 3 of the owner's own items
// (photos included), styled with the selected design's tokens, so the
// tone/shape of the chosen layout+color is actually visible before
// committing to it, without needing to open the full-screen preview first.
// Falls back to 2 sample cards when there's no menu data yet. Tapping it
// (see caller) opens the same full-screen preview, rendered with the real
// menu.
function MiniMenuPreview({
  menuLayout,
  menuColor,
  categories,
  items,
}: {
  menuLayout: MobileMenuLayoutId;
  menuColor: MobileMenuColorId;
  categories: Category[];
  items: Item[];
}) {
  const p = resolveMobilePalette(menuLayout, menuColor);
  const available = items.filter((i) => i.is_available);
  const firstCategoryWithItems = categories.find((c) => available.some((i) => i.category_id === c.id));
  const sampleItems = firstCategoryWithItems
    ? available.filter((i) => i.category_id === firstCategoryWithItems.id).slice(0, 3)
    : available.slice(0, 3);
  const categoryLabel = firstCategoryWithItems?.name ?? "Sample Category";
  const cards =
    sampleItems.length > 0
      ? sampleItems
      : [
          { id: "sample-1", name: "Sample Dish", price: 180, photo_url: null },
          { id: "sample-2", name: "Another Dish", price: 220, photo_url: null },
        ];

  if (menuLayout === "jamezz-dark") {
    const categoryIdsWithItems = new Set(available.map((i) => i.category_id));
    const majors = categories.filter((c) => {
      if (c.parent_id) return false;
      const children = categories.filter((child) => child.parent_id === c.id);
      return children.length > 0 ? children.some((child) => categoryIdsWithItems.has(child.id)) : categoryIdsWithItems.has(c.id);
    });
    const firstMajor = majors[0];
    const subs = firstMajor ? categories.filter((c) => c.parent_id === firstMajor.id && categoryIdsWithItems.has(c.id)) : [];
    const leafId = subs[0]?.id ?? firstMajor?.id ?? null;
    const leafCards = (leafId ? available.filter((i) => i.category_id === leafId).slice(0, 3) : []).length > 0
      ? available.filter((i) => i.category_id === leafId).slice(0, 3)
      : cards;
    return (
      <View style={[styles.miniPreview, { backgroundColor: p.pageBackground }]}>
        {majors.length > 0 && (
          <View style={styles.jamezzMiniMajorRow}>
            {majors.map((m, idx) => (
              <Text key={m.id} style={[styles.jamezzMiniMajorLabel, { color: idx === 0 ? p.brand : "#8a8a8a" }]}>
                {m.name}
              </Text>
            ))}
          </View>
        )}
        {subs.length > 0 && (
          <View style={styles.jamezzMiniSubRow}>
            {subs.map((s, idx) => (
              <Text
                key={s.id}
                style={[
                  styles.jamezzMiniSubChip,
                  idx === 0 ? { backgroundColor: p.brand, color: "#ffffff" } : { borderWidth: 1, borderColor: p.cardBorderColor, color: "#8a8a8a" },
                ]}
              >
                {s.name}
              </Text>
            ))}
          </View>
        )}
        <View style={[styles.miniListGroup, { borderColor: p.cardBorderColor, backgroundColor: p.cardBackground }]}>
          {leafCards.map((item, idx) => (
            <View key={item.id} style={[styles.miniListRow, idx > 0 && { borderTopWidth: 1, borderTopColor: p.cardBorderColor }]}>
              <View style={styles.miniListPhoto}>
                {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.miniCardImage} /> : null}
              </View>
              <View style={styles.miniListTextWrap}>
                <Text style={[styles.miniCardName, { color: p.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.miniListPrice, { color: p.brand }]}>{formatPeso(item.price)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (menuLayout === "minimal-list") {
    return (
      <View style={[styles.miniPreview, { backgroundColor: p.pageBackground }]}>
        <Text style={[styles.swatchCategoryLabelFlat, { color: p.foreground }]}>{categoryLabel}</Text>
        <View style={[styles.miniListGroup, { borderColor: p.cardBorderColor, backgroundColor: p.cardBackground }]}>
          {cards.map((item, idx) => (
            <View key={item.id} style={[styles.miniListRow, idx > 0 && { borderTopWidth: 1, borderTopColor: p.cardBorderColor }]}>
              <View style={styles.miniListPhoto}>
                {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.miniCardImage} /> : null}
              </View>
              <View style={styles.miniListTextWrap}>
                <Text style={[styles.miniCardName, { color: p.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.miniListPrice, { color: p.brand }]}>{formatPeso(item.price)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.miniPreview, { backgroundColor: p.pageBackground }]}>
      <Text
        style={[
          styles.swatchCategoryLabel,
          { color: p.brand, backgroundColor: `${p.brand}26` },
        ]}
      >
        {categoryLabel}
      </Text>
      <View style={styles.miniPreviewRow}>
        {cards.map((item) => (
          <View key={item.id} style={[styles.miniCard, { backgroundColor: p.cardBackground, borderColor: p.cardBorderColor, borderWidth: 1 }]}>
            <View style={styles.miniCardPhoto}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.miniCardImage} />
              ) : (
                <Text style={styles.photoPlaceholderText}>Menuko</Text>
              )}
            </View>
            <View style={styles.miniCardTextWrap}>
              <View style={[styles.miniCardPriceBadge, { backgroundColor: p.brand }]}>
                <Text style={styles.miniCardPriceText}>{formatPeso(item.price)}</Text>
              </View>
              <Text style={[styles.miniCardName, { color: p.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CategorySection({
  category,
  items,
  isFirst,
  isLast,
  onMove,
  onRename,
  onDelete,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onToggleFeatured,
  restaurantId,
  hasSubcategories,
}: {
  category: Category | null;
  items: Item[];
  isFirst?: boolean;
  isLast?: boolean;
  onMove?: (dir: "up" | "down") => void;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  onAddItem: (name: string, price: number, photoUrl: string | null) => void;
  onUpdateItem: (id: string, patch: Partial<Item>) => void;
  onDeleteItem: (id: string) => void;
  onToggleFeatured: (item: Item) => void;
  restaurantId: string;
  hasSubcategories?: boolean;
}) {
  const [name, setName] = useState(category?.name ?? "Uncategorized");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newPhoto, setNewPhoto] = useState<string | null>(null);

  return (
    <View style={styles.card}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitleRow}>
          {category && onMove && (
            <View>
              <TouchableOpacity disabled={isFirst} onPress={() => onMove("up")}>
                <Text style={[styles.moveArrow, isFirst && styles.moveArrowDisabled]}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isLast} onPress={() => onMove("down")}>
                <Text style={[styles.moveArrow, isLast && styles.moveArrowDisabled]}>▼</Text>
              </TouchableOpacity>
            </View>
          )}
          {category ? (
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={() => name !== category.name && onRename?.(name)}
              style={styles.categoryInput}
            />
          ) : (
            <Text style={styles.categoryTitleMuted}>Uncategorized</Text>
          )}
        </View>
        {category && onDelete && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                `Delete "${category.name}"?`,
                hasSubcategories
                  ? "Its subcategories will be deleted too, and all their items will move to Uncategorized."
                  : "Items in this category will move to Uncategorized.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: onDelete },
                ],
              );
            }}
          >
            <Text style={styles.link}>Delete category</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          restaurantId={restaurantId}
          onUpdate={(patch) => onUpdateItem(item.id, patch)}
          onDelete={() => onDeleteItem(item.id)}
          onToggleFeatured={() => onToggleFeatured(item)}
        />
      ))}

      <View style={styles.addItemRow}>
        <TouchableOpacity
          style={styles.photoBox}
          onPress={async () => {
            const url = await pickAndUploadPhoto("menu-photos", restaurantId);
            if (url) setNewPhoto(url);
          }}
        >
          {newPhoto ? (
            <Image source={{ uri: newPhoto }} style={styles.photoBoxImage} />
          ) : (
            <Text style={styles.photoBoxText}>Photo</Text>
          )}
        </TouchableOpacity>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Item name"
          placeholderTextColor="#8a7c68"
          style={[styles.input, { flex: 1 }]}
        />
        <TextInput
          value={newPrice}
          onChangeText={setNewPrice}
          placeholder="₱"
          placeholderTextColor="#8a7c68"
          keyboardType="decimal-pad"
          style={[styles.input, { width: 60 }]}
        />
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            const parsed = Number(newPrice);
            if (!newName.trim() || Number.isNaN(parsed)) return;
            onAddItem(newName, parsed, newPhoto);
            setNewName("");
            setNewPrice("");
            setNewPhoto(null);
          }}
        >
          <Text style={styles.primaryButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ItemRow({
  item,
  restaurantId,
  onUpdate,
  onDelete,
  onToggleFeatured,
}: {
  item: Item;
  restaurantId: string;
  onUpdate: (patch: Partial<Item>) => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [description, setDescription] = useState(item.description ?? "");
  const [ingredients, setIngredients] = useState(item.ingredients ?? "");
  const [allergyInfo, setAllergyInfo] = useState(item.allergy_info ?? "");
  const [cookTime, setCookTime] = useState(item.cook_time_minutes?.toString() ?? "");
  const [ingredientCost, setIngredientCost] = useState(item.ingredient_cost?.toString() ?? "");

  function saveDetails() {
    const parsed = cookTime.trim() ? Number(cookTime) : null;
    const parsedCost = ingredientCost.trim() ? Number(ingredientCost) : null;
    onUpdate({
      description: description.trim() || null,
      ingredients: ingredients.trim() || null,
      allergy_info: allergyInfo.trim() || null,
      cook_time_minutes: parsed !== null && Number.isNaN(parsed) ? null : parsed,
      ingredient_cost: parsedCost !== null && Number.isNaN(parsedCost) ? null : parsedCost,
    });
  }

  return (
    <View style={styles.itemBlock}>
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.photoBox}
          onPress={async () => {
            const url = await pickAndUploadPhoto("menu-photos", restaurantId);
            if (url) onUpdate({ photo_url: url });
          }}
        >
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.photoBoxImage} />
          ) : (
            <Text style={styles.photoBoxText}>Photo</Text>
          )}
        </TouchableOpacity>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={() => name !== item.name && onUpdate({ name })}
          style={[styles.input, { flex: 1 }]}
        />
        <TextInput
          value={price}
          onChangeText={setPrice}
          onBlur={() => {
            const parsed = Number(price);
            if (!Number.isNaN(parsed) && parsed !== item.price) onUpdate({ price: parsed });
          }}
          keyboardType="decimal-pad"
          style={[styles.input, { width: 60 }]}
        />
        <TouchableOpacity onPress={() => onUpdate({ is_available: !item.is_available })}>
          <Text style={styles.availabilityToggle}>{item.is_available ? "✅" : "🚫"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleFeatured} accessibilityLabel="Toggle Our Best">
          <Text style={styles.availabilityToggle}>{item.is_featured ? "⭐" : "☆"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}>
          <Text style={styles.link}>Delete</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => setDetailsOpen((open) => !open)}>
        <Text style={styles.detailsToggle}>
          {detailsOpen ? "Hide details" : "Description / ingredients / allergy / time"}
        </Text>
      </TouchableOpacity>

      {detailsOpen && (
        <View style={styles.detailsForm}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            onBlur={saveDetails}
            placeholder="Short description customers see when they tap this item"
            placeholderTextColor="#8a7c68"
            multiline
            style={[styles.input, styles.detailsTextarea]}
          />
          <TextInput
            value={ingredients}
            onChangeText={setIngredients}
            onBlur={saveDetails}
            placeholder="Ingredients (e.g. Pork belly, kimchi, tofu)"
            placeholderTextColor="#8a7c68"
            style={styles.input}
          />
          <TextInput
            value={allergyInfo}
            onChangeText={setAllergyInfo}
            onBlur={saveDetails}
            placeholder="Allergy info (e.g. Contains shellfish)"
            placeholderTextColor="#8a7c68"
            style={styles.input}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={cookTime}
              onChangeText={setCookTime}
              onBlur={saveDetails}
              placeholder="Cook time (minutes)"
              placeholderTextColor="#8a7c68"
              keyboardType="number-pad"
              style={[styles.input, { width: 140 }]}
            />
            <TextInput
              value={ingredientCost}
              onChangeText={setIngredientCost}
              onBlur={saveDetails}
              placeholder="Ingredient cost (₱)"
              placeholderTextColor="#8a7c68"
              keyboardType="decimal-pad"
              style={[styles.input, { width: 140 }]}
            />
          </View>
          <Text style={styles.costHint}>
            Optional — used for the Sales Report&apos;s menu profitability chart. Not shown to customers.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  featuredHint: { fontSize: 11, color: "#8a7c68", lineHeight: 15 },
  addMenuLabel: { fontSize: 13, fontWeight: "700" },
  addMenuRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  manualEntryButton: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  manualEntryButtonText: { fontSize: 13, fontWeight: "600", color: "#8a7c68" },
  addCategoryRow: { flexDirection: "row", gap: 8 },
  parentPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  parentChip: { borderWidth: 1, borderColor: "#ece2d3", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  parentChipActive: { borderColor: "#ea7c1f", backgroundColor: "#fff0e0" },
  parentChipText: { fontSize: 11, fontWeight: "600", color: "#3c3327" },
  categoryGroup: { gap: 10 },
  subcategoryList: { marginLeft: 16, gap: 10, borderLeftWidth: 2, borderLeftColor: "#ece2d3", paddingLeft: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  primaryButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingHorizontal: 16, justifyContent: "center" },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  designCard: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#ece2d3", padding: 14, gap: 10 },
  designCardTitle: { fontSize: 14, fontWeight: "700", color: "#ea7c1f" },
  designCardHint: { fontSize: 11, color: "#8a7c68", lineHeight: 15 },
  designAxisLabel: { fontSize: 10.5, fontWeight: "700", color: "#8a7c68", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  templateChip: { borderWidth: 1, borderColor: "#ece2d3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  templateChipActive: { borderColor: "#ea7c1f", backgroundColor: "#fff0e0" },
  templateChipText: { fontSize: 12, fontWeight: "600" },
  swatchCategoryLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  swatchCategoryLabelFlat: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  swatchCaption: { fontSize: 12, color: "#8a7c68", textAlign: "center", marginTop: 8 },
  previewButton: {
    marginTop: 10,
    backgroundColor: "#ea7c1f",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  previewButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  paletteCard: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fffaf3",
    borderWidth: 1,
    borderColor: "#ece2d3",
  },
  paletteSwatch: { flex: 1, alignItems: "center", gap: 4 },
  paletteSwatchColor: { width: "100%", height: 40, borderRadius: 8, borderWidth: 1 },
  paletteSwatchLabel: { fontSize: 10.5, fontWeight: "700", color: "#3c3327" },
  miniPreview: { borderRadius: 14, padding: 14, marginTop: 4, gap: 10 },
  jamezzMiniMajorRow: { flexDirection: "row", gap: 12 },
  jamezzMiniMajorLabel: { fontSize: 10.5, fontWeight: "700" },
  jamezzMiniSubRow: { flexDirection: "row", gap: 5 },
  jamezzMiniSubChip: { fontSize: 8.5, fontWeight: "600", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, overflow: "hidden" },
  miniPreviewRow: { flexDirection: "row", gap: 10 },
  miniCard: { width: 108, borderRadius: 12, overflow: "hidden" },
  miniCardPhoto: { width: "100%", height: 78, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#f2ede6" },
  miniCardImage: { width: "100%", height: "100%" },
  photoPlaceholderText: { fontSize: 10, color: "#8a7c68" },
  miniCardTextWrap: { position: "relative", paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8 },
  miniListGroup: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  miniListRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8 },
  miniListPhoto: { width: 32, height: 32, borderRadius: 6, overflow: "hidden", backgroundColor: "#f2ede6" },
  miniListTextWrap: { flex: 1, gap: 1 },
  miniListPrice: { fontSize: 10, fontWeight: "700" },
  miniCardPriceBadge: {
    position: "absolute",
    top: -9,
    left: 6,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  miniCardPriceText: { color: "#ffffff", fontSize: 10, fontWeight: "700" },
  miniCardName: { fontSize: 11.5, fontWeight: "500", marginTop: 3 },
  card: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#ece2d3", padding: 14, gap: 10 },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  categoryInput: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    color: "#ea7c1f",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryTitleMuted: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8a7c68",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  moveArrow: { fontSize: 11, color: "#8a7c68" },
  moveArrowDisabled: { opacity: 0.25 },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  itemBlock: { gap: 6 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailsToggle: { fontSize: 11, color: "#8a7c68", textDecorationLine: "underline" },
  detailsForm: { gap: 6, paddingLeft: 52 },
  detailsTextarea: { minHeight: 50, textAlignVertical: "top" },
  costHint: { fontSize: 10, color: "#8a7c68", lineHeight: 14 },
  addItemRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: "#ece2d3", paddingTop: 10 },
  photoBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#fffaf3",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoBoxImage: { width: "100%", height: "100%" },
  photoBoxText: { fontSize: 9, color: "#8a7c68" },
  availabilityToggle: { fontSize: 16 },
});
