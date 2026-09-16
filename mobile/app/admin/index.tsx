import { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { pickAndUploadPhoto } from "@/lib/upload-photo";
import { AdminHeader } from "@/components/AdminHeader";

type Category = { id: string; name: string; sort_order: number };
type Item = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  photo_url: string | null;
  is_available: boolean;
};

export default function AdminMenu() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const [{ data: cats }, { data: itemRows }] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select("id, category_id, name, price, photo_url, is_available")
        .eq("restaurant_id", restaurantId)
        .order("sort_order"),
    ]);
    setCategories(cats ?? []);
    setItems(itemRows ?? []);
  }, [restaurantId]);

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
      })
      .eq("id", id);
    load();
  }

  async function deleteItem(id: string) {
    await supabase.from("menu_items").delete().eq("id", id);
    load();
  }

  const uncategorized = items.filter((i) => i.category_id === null);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Menu" />
      <ScrollView contentContainerStyle={styles.content}>
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
            restaurantId={restaurantId ?? ""}
          />
        )}
      </ScrollView>
    </SafeAreaView>
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
}: {
  item: Item;
  restaurantId: string;
  onUpdate: (patch: Partial<Item>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));

  return (
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
      <TouchableOpacity onPress={onDelete}>
        <Text style={styles.link}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffaf3" },
  content: { padding: 16, gap: 16 },
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
  card: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#ece2d3", padding: 14, gap: 10 },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  categoryInput: { fontSize: 15, fontWeight: "700", flex: 1 },
  categoryTitleMuted: { fontSize: 15, fontWeight: "700", color: "#8a7c68" },
  moveArrow: { fontSize: 11, color: "#8a7c68" },
  moveArrowDisabled: { opacity: 0.25 },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
