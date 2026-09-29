"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPeso } from "@/lib/money";
import { uploadPhoto } from "@/lib/upload-photo";
import {
  addCategory,
  renameCategory,
  deleteCategory,
  moveCategory,
  addItem,
  updateItem,
  deleteItem,
} from "./menu-actions";
import { MenuImport } from "./menu-import";

type Category = { id: string; name: string; sort_order: number; parent_id: string | null };
type Item = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  photo_url: string | null;
  is_available: boolean;
  sort_order: number;
  description: string | null;
  ingredients: string | null;
  allergy_info: string | null;
  cook_time_minutes: number | null;
  is_featured: boolean;
};

const MAX_FEATURED_ITEMS = 5;

export function MenuManager({
  restaurantId,
  initialCategories,
  initialItems,
}: {
  restaurantId: string;
  initialCategories: Category[];
  initialItems: Item[];
}) {
  const router = useRouter();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState("");
  const [pending, startTransition] = useTransition();
  const categoryInputRef = useRef<HTMLInputElement>(null);

  function afterMutate() {
    startTransition(() => router.refresh());
  }

  const topLevelCategories = initialCategories.filter((c) => !c.parent_id);
  const subcategoriesByParent = new Map<string, Category[]>();
  for (const c of initialCategories) {
    if (!c.parent_id) continue;
    const list = subcategoriesByParent.get(c.parent_id) ?? [];
    list.push(c);
    subcategoriesByParent.set(c.parent_id, list);
  }
  const uncategorized = initialItems.filter(
    (item) => item.category_id === null,
  );
  return (
    <div className="flex flex-col gap-8">
      <OurBestPicker
        categories={initialCategories}
        items={initialItems}
        onMutate={afterMutate}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Add your menu</p>
        <div className="flex flex-wrap items-center gap-3">
          <MenuImport />
          <button
            type="button"
            onClick={() => categoryInputRef.current?.focus()}
            className="self-start rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-brand hover:text-brand"
          >
            Enter manually
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newCategoryName.trim()) return;
          addCategory(newCategoryName, newCategoryParentId || null).then(afterMutate);
          setNewCategoryName("");
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          ref={categoryInputRef}
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name (e.g. Drinks, Mains)"
          className="min-w-40 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <select
          value={newCategoryParentId}
          onChange={(e) => setNewCategoryParentId(e.target.value)}
          title="Parent category — leave as None to add a top-level category"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">No parent (top-level category)</option>
          {topLevelCategories.map((c) => (
            <option key={c.id} value={c.id}>
              Subcategory of &ldquo;{c.name}&rdquo;
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
        >
          Add category
        </button>
      </form>

      {topLevelCategories.map((category, index) => {
        const subcategories = subcategoriesByParent.get(category.id) ?? [];
        return (
          <div key={category.id} className="flex flex-col gap-4">
            <CategorySection
              restaurantId={restaurantId}
              category={category}
              items={initialItems.filter((item) => item.category_id === category.id)}
              onMutate={afterMutate}
              isFirst={index === 0}
              isLast={index === topLevelCategories.length - 1}
              hasSubcategories={subcategories.length > 0}
            />
            {subcategories.length > 0 && (
              <div className="ml-6 flex flex-col gap-4 border-l-2 border-border pl-4">
                {subcategories.map((sub, subIndex) => (
                  <CategorySection
                    key={sub.id}
                    restaurantId={restaurantId}
                    category={sub}
                    items={initialItems.filter((item) => item.category_id === sub.id)}
                    onMutate={afterMutate}
                    isFirst={subIndex === 0}
                    isLast={subIndex === subcategories.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {uncategorized.length > 0 && (
        <CategorySection
          restaurantId={restaurantId}
          category={null}
          items={uncategorized}
          onMutate={afterMutate}
        />
      )}
    </div>
  );
}

// "Our Best" is picked here, once, from the whole menu (not per category) —
// every customer layout shows these picks together at the very top of the
// menu, so the owner chooses them in one place at the top of the editor too.
function OurBestPicker({
  categories,
  items,
  onMutate,
}: {
  categories: Category[];
  items: Item[];
  onMutate: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const featured = items.filter((item) => item.is_featured);
  const full = featured.length >= MAX_FEATURED_ITEMS;

  // Candidates grouped in the same order as the editor below: each major
  // category followed by its subcategories, then Uncategorized.
  const groups: { label: string; items: Item[] }[] = [];
  for (const major of categories.filter((c) => !c.parent_id)) {
    const chain = [major, ...categories.filter((c) => c.parent_id === major.id)];
    for (const c of chain) {
      groups.push({
        label: c.parent_id ? `${major.name} › ${c.name}` : c.name,
        items: items.filter((item) => item.category_id === c.id && !item.is_featured),
      });
    }
  }
  groups.push({ label: "Uncategorized", items: items.filter((item) => item.category_id === null && !item.is_featured) });
  const candidateGroups = groups.filter((g) => g.items.length > 0);

  async function setFeatured(itemId: string, isFeatured: boolean) {
    setSaving(true);
    try {
      await updateItem(itemId, { isFeatured });
      onMutate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">⭐ Our Best</h3>
        <span className="text-xs font-semibold text-brand">
          {featured.length}/{MAX_FEATURED_ITEMS}
        </span>
      </div>
      <p className="text-xs text-muted">
        Pick up to {MAX_FEATURED_ITEMS} dishes from your whole menu. They&apos;re shown together at the very top of your customer menu, in every layout.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: MAX_FEATURED_ITEMS }, (_, i) => {
          const item = featured[i];
          if (!item) {
            return (
              <div key={`empty-${i}`} className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
                Empty
              </div>
            );
          }
          return (
            <div key={item.id} className="relative flex h-28 flex-col overflow-hidden rounded-lg border border-border bg-card">
              <div className="relative h-16 w-full bg-background">
                {item.photo_url ? (
                  <Image src={item.photo_url} alt="" fill sizes="160px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-muted">Photo</span>
                )}
              </div>
              <div className="min-w-0 px-2 py-1">
                <p className="truncate text-xs font-medium">{item.name}</p>
                <p className="text-[11px] text-muted">{formatPeso(item.price)}</p>
              </div>
              <button
                type="button"
                onClick={() => setFeatured(item.id, false)}
                disabled={saving}
                aria-label={`Remove ${item.name} from Our Best`}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white transition hover:bg-black/80 disabled:opacity-60"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <select
        value=""
        disabled={full || saving || candidateGroups.length === 0}
        onChange={(e) => {
          if (e.target.value) setFeatured(e.target.value, true);
        }}
        className="self-start rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-60"
      >
        <option value="">
          {full
            ? `Our Best is full — remove one to add another`
            : candidateGroups.length === 0
              ? "Add menu items below first"
              : "+ Add a dish to Our Best…"}
        </option>
        {candidateGroups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {formatPeso(item.price)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </section>
  );
}

function CategorySection({
  restaurantId,
  category,
  items,
  onMutate,
  isFirst,
  isLast,
  hasSubcategories,
}: {
  restaurantId: string;
  category: Category | null;
  items: Item[];
  onMutate: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  hasSubcategories?: boolean;
}) {
  const [name, setName] = useState(category?.name ?? "Uncategorized");

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1">
          {category && (
            <div className="flex flex-col">
              <button
                onClick={() => moveCategory(category.id, "up").then(onMutate)}
                disabled={isFirst}
                title="Move up"
                className="leading-none text-muted transition hover:text-brand disabled:opacity-25"
              >
                ▲
              </button>
              <button
                onClick={() => moveCategory(category.id, "down").then(onMutate)}
                disabled={isLast}
                title="Move down"
                className="leading-none text-muted transition hover:text-brand disabled:opacity-25"
              >
                ▼
              </button>
            </div>
          )}
          {category ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name.trim() && name !== category.name) {
                  renameCategory(category.id, name).then(onMutate);
                }
              }}
              className="flex-1 rounded-lg border border-transparent bg-transparent px-1 text-base font-semibold outline-none focus:border-brand"
            />
          ) : (
            <span className="text-base font-semibold text-muted">
              Uncategorized
            </span>
          )}
        </div>
        {category && (
          <button
            onClick={() => {
              if (
                confirm(
                  hasSubcategories
                    ? `Delete category "${category.name}"? Its subcategories will be deleted too, and all their items will move to Uncategorized.`
                    : `Delete category "${category.name}"? (Items move to Uncategorized)`,
                )
              ) {
                deleteCategory(category.id).then(onMutate);
              }
            }}
            className="text-xs text-muted underline"
          >
            Delete category
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            restaurantId={restaurantId}
            item={item}
            onMutate={onMutate}
          />
        ))}
      </div>

      <AddItemForm
        restaurantId={restaurantId}
        categoryId={category?.id ?? null}
        onMutate={onMutate}
      />
    </section>
  );
}

function ItemRow({
  restaurantId,
  item,
  onMutate,
}: {
  restaurantId: string;
  item: Item;
  onMutate: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [uploading, setUploading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [description, setDescription] = useState(item.description ?? "");
  const [ingredients, setIngredients] = useState(item.ingredients ?? "");
  const [allergyInfo, setAllergyInfo] = useState(item.allergy_info ?? "");
  const [cookTime, setCookTime] = useState(
    item.cook_time_minutes?.toString() ?? "",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(file: File) {
    setUploading(true);
    try {
      const url = await uploadPhoto("menu-photos", restaurantId, file);
      await updateItem(item.id, { photoUrl: url });
      onMutate();
    } finally {
      setUploading(false);
    }
  }

  async function saveDetails() {
    const parsedCookTime = cookTime.trim() ? Number(cookTime) : null;
    await updateItem(item.id, {
      description: description.trim() || null,
      ingredients: ingredients.trim() || null,
      allergyInfo: allergyInfo.trim() || null,
      cookTimeMinutes: Number.isNaN(parsedCookTime) ? null : parsedCookTime,
    });
    onMutate();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-background"
          title="Change photo"
        >
          {item.photo_url ? (
            <Image
              src={item.photo_url}
              alt={item.name}
              fill
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-muted">
              Photo
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
              Uploading
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoChange(file);
            e.target.value = "";
          }}
        />

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== item.name)
              updateItem(item.id, { name }).then(onMutate);
          }}
          className="min-w-32 flex-1 rounded-lg border border-transparent bg-transparent px-1 text-sm outline-none focus:border-brand"
        />

        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => {
            const parsed = Number(price);
            if (!Number.isNaN(parsed) && parsed !== item.price) {
              updateItem(item.id, { price: parsed }).then(onMutate);
            }
          }}
          inputMode="decimal"
          className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-brand"
        />

        <label className="flex items-center gap-1 text-xs text-muted">
          <input
            type="checkbox"
            checked={item.is_available}
            onChange={(e) =>
              updateItem(item.id, { isAvailable: e.target.checked }).then(
                onMutate,
              )
            }
          />
          Available
        </label>

        <button
          onClick={() => setDetailsOpen((open) => !open)}
          className="text-xs text-muted underline"
        >
          {detailsOpen
            ? "Hide details"
            : "Description/ingredients/allergy/time"}
        </button>

        <button
          onClick={() => {
            if (confirm(`Delete "${item.name}"?`)) {
              deleteItem(item.id).then(onMutate);
            }
          }}
          className="text-xs text-muted underline"
        >
          Delete
        </button>
      </div>

      {detailsOpen && (
        <div className="flex flex-col gap-2 border-t border-border pt-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDetails}
              rows={2}
              placeholder="A short description customers see when they tap this item"
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Ingredients
            <input
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              onBlur={saveDetails}
              placeholder="e.g. Pork belly, kimchi, tofu, scallion"
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Allergy info
            <input
              value={allergyInfo}
              onChange={(e) => setAllergyInfo(e.target.value)}
              onBlur={saveDetails}
              placeholder="e.g. Contains shellfish, soy"
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Cook time (minutes)
            <input
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              onBlur={saveDetails}
              inputMode="numeric"
              placeholder="e.g. 15"
              className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function AddItemForm({
  restaurantId,
  categoryId,
  onMutate,
}: {
  restaurantId: string;
  categoryId: string | null;
  onMutate: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrice = Number(price);
    if (!name.trim() || Number.isNaN(parsedPrice)) return;

    setSubmitting(true);
    try {
      const photoUrl = file
        ? await uploadPhoto("menu-photos", restaurantId, file)
        : null;
      await addItem({ categoryId, name, price: parsedPrice, photoUrl });
      setName("");
      setPrice("");
      setFile(null);
      onMutate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 border-t border-border pt-3"
    >
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-40 text-xs"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className="min-w-32 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price (₱)"
        inputMode="decimal"
        className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting
          ? "Adding..."
          : `Add item${price ? ` (${formatPeso(Number(price) || 0)})` : ""}`}
      </button>
    </form>
  );
}
