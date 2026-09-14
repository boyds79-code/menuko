import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MenuManager } from "./menu-manager";

export default async function AdminMenuPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", ctx.restaurantId)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("id, category_id, name, price, photo_url, is_available, sort_order")
      .eq("restaurant_id", ctx.restaurantId)
      .order("sort_order"),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">메뉴 관리</h1>
        <a
          href={`/print/${ctx.restaurantId}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-brand hover:text-brand"
        >
          인쇄용 메뉴판 열기
        </a>
      </div>
      <p className="-mt-2 text-xs text-muted">
        메뉴/가격/사진을 입력하면 손님용 웹 메뉴와 인쇄용 메뉴판이 같은 데이터로 자동 만들어져요.
        디자인은 &ldquo;인쇄용 메뉴판 열기&rdquo;에서 고를 수 있고, 고른 디자인이 웹 메뉴에도
        그대로 적용됩니다.
      </p>
      <MenuManager
        restaurantId={ctx.restaurantId}
        initialCategories={categories ?? []}
        initialItems={items ?? []}
      />
    </main>
  );
}
