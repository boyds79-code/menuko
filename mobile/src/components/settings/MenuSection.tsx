import { useCallback, useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { pickAndUploadPhoto } from "@/lib/upload-photo";
import { MOBILE_MENU_TEMPLATES, MOBILE_TEMPLATE_STYLES, type MobileMenuTemplateId } from "@/lib/menu-templates";
import { formatPeso } from "@/lib/money";
import { MenuPreviewModal } from "./MenuPreviewModal";

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
  is_featured: boolean;
};

const MAX_FEATURED_ITEMS = 3;

export function MenuSection() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [menuTemplate, setMenuTemplate] = useState<MobileMenuTemplateId>("classic");

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const [{ data: cats }, { data: itemRows }, { data: restaurant }] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id, category_id, name, price, photo_url, is_available, description, ingredients, allergy_info, cook_time_minutes, is_featured",
        )
        .eq("restaurant_id", restaurantId)
        .order("sort_order"),
      supabase.from("restaurants").select("menu_template").eq("id", restaurantId).single(),
    ]);
    setCategories(cats ?? []);
    setItems(itemRows ?? []);
    if (restaurant?.menu_template) setMenuTemplate(restaurant.menu_template as MobileMenuTemplateId);
  }, [restaurantId]);

  async function saveMenuTemplate(id: MobileMenuTemplateId) {
    setMenuTemplate(id);
    if (!restaurantId) return;
    await supabase.from("restaurants").update({ menu_template: id }).eq("id", restaurantId);
  }

  useEffect(() => {
    // Fetch-in-effect: setState only happens after the awaits inside
    // load(), not synchronously — same pattern as kitchen/cashier screens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function addCategory() {
    if (!newCategoryName.trim() || !restaurantId) return;
    await supabase
      .from("menu_categories")
      .insert({ restaurant_id: restaurantId, name: newCategoryName.trim(), sort_order: categories.length });
    setNewCategoryName("");
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
    const ids = categories.map((c) => c.id);
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
      })
      .eq("id", id);
    load();
  }

  async function deleteItem(id: string) {
    await supabase.from("menu_items").delete().eq("id", id);
    load();
  }

  const featuredCount = items.filter((i) => i.is_featured).length;

  function toggleFeatured(item: Item) {
    if (!item.is_featured && featuredCount >= MAX_FEATURED_ITEMS) {
      Alert.alert(
        "Our Best is full",
        `Only ${MAX_FEATURED_ITEMS} items can be featured at once — turn one off first.`,
      );
      return;
    }
    updateItem(item.id, { is_featured: !item.is_featured });
  }

  const uncategorized = items.filter((i) => i.category_id === null);

  return (
    <View style={styles.content}>
      <Text style={styles.featuredHint}>
        ⭐ marks up to {MAX_FEATURED_ITEMS} items shown as &ldquo;Our Best!&rdquo; on the customer menu ({featuredCount}/{MAX_FEATURED_ITEMS} used)
      </Text>

      <View style={styles.addCategoryRow}>
        <TextInput
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

      {categories.map((category, index) => (
        <CategorySection
          key={category.id}
          category={category}
          items={items.filter((i) => i.category_id === category.id)}
          isFirst={index === 0}
          isLast={index === categories.length - 1}
          onMove={(dir) => moveCategory(category.id, dir)}
          onRename={(name) => renameCategory(category.id, name)}
          onDelete={() => deleteCategory(category.id)}
          onAddItem={(name, price, photoUrl) => addItem(category.id, name, price, photoUrl)}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
          onToggleFeatured={toggleFeatured}
          restaurantId={restaurantId ?? ""}
        />
      ))}

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
        <Text style={styles.designCardHint}>
          Applies to both the customer web menu and the printable menu.
        </Text>
        <View style={styles.templateRow}>
          {MOBILE_MENU_TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => saveMenuTemplate(t.id)}
              style={[styles.templateChip, menuTemplate === t.id && styles.templateChipActive]}
            >
              <Text style={styles.templateChipText}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => setPreviewOpen(true)} activeOpacity={0.7}>
          <ToneSwatch menuTemplate={menuTemplate} />
          <Text style={styles.swatchCaption}>Tap to preview the full menu</Text>
        </TouchableOpacity>
      </View>

      <MenuPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        categories={categories}
        items={items}
        menuTemplate={menuTemplate}
      />
    </View>
  );
}

// A tiny sample row (not real menu data) styled with the selected
// template's tokens — just enough to see the tone shift between Classic/
// Warm/Minimal before committing to it. Tapping it (see caller) opens the
// same full-screen preview, now rendered with real menu data.
function ToneSwatch({ menuTemplate }: { menuTemplate: MobileMenuTemplateId }) {
  const t = MOBILE_TEMPLATE_STYLES[menuTemplate];
  return (
    <View
      style={[
        styles.swatchRow,
        { backgroundColor: t.pageBackground, borderColor: t.cardBorderColor, borderWidth: t.cardBorderWidth, borderRadius: t.cardBorderRadius },
      ]}
    >
      <View style={[styles.swatchPhoto, { backgroundColor: t.photoBackground, borderRadius: t.photoShape }]} />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.swatchCategoryLabel,
            { color: t.categoryLabelColor },
            t.categoryLabelUppercase && { textTransform: "uppercase" },
            t.categoryLabelTracked && { letterSpacing: 1.5 },
            t.categoryLabelBackground && {
              backgroundColor: t.categoryLabelBackground,
              borderRadius: t.categoryLabelRadius,
              paddingHorizontal: 8,
              paddingVertical: 2,
              alignSelf: "flex-start",
            },
          ]}
        >
          Sample Dish
        </Text>
        <Text style={[styles.swatchPrice, { color: t.priceColor }]}>{formatPeso(180)}</Text>
      </View>
      <View
        style={[
          styles.swatchAddButton,
          { borderRadius: t.addButtonRadius, borderColor: t.addButtonColor },
          t.addButtonFilled && { backgroundColor: t.addButtonColor },
        ]}
      >
        <Text style={{ fontSize: 11, fontWeight: "700", color: t.addButtonFilled ? "#ffffff" : t.addButtonColor }}>
          Add
        </Text>
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
          <TouchableOpacity onPress={onDelete}>
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

  function saveDetails() {
    const parsed = cookTime.trim() ? Number(cookTime) : null;
    onUpdate({
      description: description.trim() || null,
      ingredients: ingredients.trim() || null,
      allergy_info: allergyInfo.trim() || null,
      cook_time_minutes: parsed !== null && Number.isNaN(parsed) ? null : parsed,
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
          <TextInput
            value={cookTime}
            onChangeText={setCookTime}
            onBlur={saveDetails}
            placeholder="Cook time (minutes)"
            placeholderTextColor="#8a7c68"
            keyboardType="number-pad"
            style={[styles.input, { width: 120 }]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  featuredHint: { fontSize: 11, color: "#8a7c68", lineHeight: 15 },
  addCategoryRow: { flexDirection: "row", gap: 8 },
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
  templateRow: { flexDirection: "row", gap: 8 },
  templateChip: { borderWidth: 1, borderColor: "#ece2d3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  templateChipActive: { borderColor: "#ea7c1f", backgroundColor: "#fff0e0" },
  templateChipText: { fontSize: 12, fontWeight: "600" },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, marginTop: 4 },
  swatchPhoto: { width: 40, height: 40 },
  swatchCategoryLabel: { fontSize: 13, fontWeight: "700" },
  swatchPrice: { fontSize: 12, marginTop: 2 },
  swatchAddButton: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  swatchCaption: { fontSize: 10, color: "#8a7c68", textAlign: "center", marginTop: 4 },
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
