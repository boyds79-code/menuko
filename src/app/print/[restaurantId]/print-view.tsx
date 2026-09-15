"use client";

import { useState } from "react";
import { formatPeso } from "@/lib/money";
import { MENU_TEMPLATES, PRINT_TEMPLATE_STYLES, type MenuTemplateId } from "@/lib/menu-templates";
import { updateRestaurant } from "@/app/admin/settings-actions";

type Category = { id: string; name: string; sort_order: number };
type Item = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
};

export function PrintView({
  restaurant,
  menuTemplate,
  canEditTemplate,
  categories,
  items,
}: {
  restaurant: { id: string; name: string; address: string | null };
  menuTemplate: MenuTemplateId;
  canEditTemplate: boolean;
  categories: Category[];
  items: Item[];
}) {
  const [template, setTemplate] = useState(menuTemplate);
  const [saving, setSaving] = useState(false);
  const style = PRINT_TEMPLATE_STYLES[template];

  async function selectTemplate(id: MenuTemplateId) {
    setTemplate(id);
    setSaving(true);
    try {
      await updateRestaurant({ menuTemplate: id });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`mx-auto flex min-h-full max-w-2xl flex-col gap-6 p-6 ${style.page}`}>
      {canEditTemplate && (
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap gap-2">
            {MENU_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => selectTemplate(tpl.id)}
                title={tpl.description}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  template === tpl.id
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border text-muted hover:border-brand hover:text-brand"
                }`}
              >
                {tpl.label}
                {saving && template === tpl.id && " ..."}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
          >
            Print / Save as PDF
          </button>
        </div>
      )}
      {!canEditTemplate && (
        <div className="flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
          >
            Print / Save as PDF
          </button>
        </div>
      )}

      <div className={style.titleBlock}>
        <h1 className={style.title}>{restaurant.name}</h1>
        {restaurant.address && <p className="mt-1 text-sm text-muted">{restaurant.address}</p>}
      </div>

      <div className="flex flex-col gap-6">
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category_id === category.id);
          if (categoryItems.length === 0) return null;
          return (
            <section key={category.id} className="break-inside-avoid">
              <h2 className={style.categoryTitle}>{category.name}</h2>
              <ul className="flex flex-col gap-1.5">
                {categoryItems.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-4">
                    <span>{item.name}</span>
                    <span className={`flex-1 border-b ${style.divider}`} />
                    <span className="font-medium">{formatPeso(item.price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <style>{`
        @page { margin: 16mm; }
        @media print {
          html, body { background: #fff; }
        }
      `}</style>
    </div>
  );
}
