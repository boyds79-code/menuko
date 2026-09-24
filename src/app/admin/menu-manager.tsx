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

type Category = { id: string; name: string; sort_order: number };
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

const MAX_FEATURED_ITEMS = 3;

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
  const [pending, startTransition] = useTransition();

  function afterMutate() {
    startTransition(() => router.refresh());
  }

  const uncategorized = initialItems.filter(
    (item) => item.category_id === null,
  );
  const featuredCount = initialItems.filter((item) => item.is_featured).length;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-xs text-muted">
        ⭐ marks up to {MAX_FEATURED_ITEMS} items shown as &ldquo;Our Best!&rdquo; on the customer menu (
        {featuredCount}/{MAX_FEATURED_ITEMS} used)
      </p>

      <MenuImport />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newCategoryName.trim()) return;
          addCategory(newCategoryName).then(afterMutate);
          setNewCategoryName("");
        }}
        className="flex gap-2"
      >
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name (e.g. Drinks, Mains)"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
        >
          Add category
        </button>
      </form>

      {initialCategories.map((category, index) => (
        <CategorySection
          key={category.id}
          restaurantId={restaurantId}
          category={category}
          items={initialItems.filter(
            (item) => item.category_id === category.id,
          )}
          onMutate={afterMutate}
          isFirst={index === 0}
          isLast={index === initialCategories.length - 1}
          featuredCount={featuredCount}
        />
      ))}

      {uncategorized.length > 0 && (
        <CategorySection
          restaurantId={restaurantId}
          category={null}
          items={uncategorized}
          onMutate={afterMutate}
          featuredCount={featuredCount}
        />
      )}
    </div>
  );
}

function CategorySection({
  restaurantId,
  category,
  items,
  onMutate,
  isFirst,
  isLast,
  featuredCount,
}: {
  restaurantId: string;
  category: Category | null;
  items: Item[];
  onMutate: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  featuredCount: number;
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
                  `Delete category "${category.name}"? (Items move to Uncategorized)`,
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
            featuredCount={featuredCount}
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
  featuredCount,
}: {
  restaurantId: string;
  item: Item;
  onMutate: () => void;
  featuredCount: number;
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

  async function toggleFeatured() {
    if (!item.is_featured && featuredCount >= MAX_FEATURED_ITEMS) {
      alert(`Only ${MAX_FEATURED_ITEMS} items can be featured at once — turn one off first.`);
      return;
    }
    await updateItem(item.id, { isFeatured: !item.is_featured });
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
          type="button"
          onClick={toggleFeatured}
          aria-pressed={item.is_featured}
          aria-label={item.is_featured ? "Remove from Our Best" : "Add to Our Best"}
          className="text-base leading-none"
        >
          {item.is_featured ? "⭐" : "☆"}
        </button>

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
