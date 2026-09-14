"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { formatPeso } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import type { OrderStatus } from "@/lib/database.types";
import { DIGITAL_TEMPLATE_STYLES, type MenuTemplateId } from "@/lib/menu-templates";
import { AdBanner, type AdContent } from "@/components/ad-banner";

type Category = { id: string; name: string; sort_order: number };
type MenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  photo_url: string | null;
  is_available: boolean;
  sort_order: number;
};
type Restaurant = {
  id: string;
  name: string;
  payment_qr_url: string | null;
  payment_link: string | null;
};

type CartLine = { item: MenuItem; quantity: number };
type ConfirmationLine = { id: string; name: string; quantity: number; unitPrice: number };
type Confirmation = {
  orderId: string;
  accessToken: string;
  lines: ConfirmationLine[];
  total: number;
};

function storageKey(qrToken: string) {
  return `menuko:order:${qrToken}`;
}

export function OrderClient({
  qrToken,
  table,
  restaurant,
  menuTemplate,
  categories,
  items,
  ad,
}: {
  qrToken: string;
  table: { id: string; label: string };
  restaurant: Restaurant;
  menuTemplate: MenuTemplateId;
  categories: Category[];
  items: MenuItem[];
  ad: AdContent | null;
}) {
  const supabase = createClient();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [status, setStatus] = useState<OrderStatus>("open");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const cartLines: CartLine[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => ({ item: itemsById.get(itemId)!, quantity }))
    .filter((line) => line.item);

  const cartTotal = cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  function setQty(itemId: string, quantity: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, quantity) }));
  }

  async function placeOrder() {
    if (cartLines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("create_order", {
        p_qr_token: qrToken,
        p_items: cartLines.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity })),
      });

      if (rpcError || !data || data.length === 0) {
        throw rpcError ?? new Error("주문 생성에 실패했습니다.");
      }

      const { order_id, access_token } = data[0];
      const lines: ConfirmationLine[] = cartLines.map((l) => ({
        id: l.item.id,
        name: l.item.name,
        quantity: l.quantity,
        unitPrice: l.item.price,
      }));
      setConfirmation({ orderId: order_id, accessToken: access_token, lines, total: cartTotal });
      setStatus("open");
      setCart({});
      try {
        sessionStorage.setItem(
          storageKey(qrToken),
          JSON.stringify({ orderId: order_id, accessToken: access_token }),
        );
      } catch {
        // Private browsing / storage disabled — confirmation just won't
        // survive a refresh, order itself already succeeded.
      }
    } catch {
      setError("주문에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  // Rehydrate the confirmation screen if the customer reloads the page
  // (e.g. phone screen locked) after already placing an order.
  useEffect(() => {
    let stored: { orderId: string; accessToken: string } | null = null;
    try {
      const raw = sessionStorage.getItem(storageKey(qrToken));
      if (raw) stored = JSON.parse(raw);
    } catch {
      stored = null;
    }
    if (!stored) return;

    supabase
      .rpc("get_order_for_customer", {
        p_order_id: stored.orderId,
        p_access_token: stored.accessToken,
      })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const lines: ConfirmationLine[] = data.map((row) => ({
          id: row.item_id,
          name: row.item_name ?? "(삭제된 메뉴)",
          quantity: row.quantity,
          unitPrice: row.unit_price_snapshot,
        }));
        const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
        setConfirmation({ orderId: stored!.orderId, accessToken: stored!.accessToken, lines, total });
        setStatus(data[0].status);
      });
    // Only run once on mount — this is a one-time rehydration, not a
    // subscription (the realtime effect below keeps status live).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!confirmation) return;
    const channel = supabase
      .channel(`order-${confirmation.orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${confirmation.orderId}`,
        },
        (payload) => {
          const next = (payload.new as { status: OrderStatus }).status;
          setStatus(next);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [confirmation, supabase]);

  if (confirmation) {
    return (
      <ConfirmationView
        restaurant={restaurant}
        table={table}
        confirmation={confirmation}
        status={status}
        ad={ad}
        onOrderMore={() => setConfirmation(null)}
      />
    );
  }

  const style = DIGITAL_TEMPLATE_STYLES[menuTemplate];

  return (
    <div className={`flex min-h-full flex-1 flex-col pb-24 ${style.page}`}>
      <header className={style.header}>
        <p className={style.headerTitle}>{restaurant.name}</p>
        <p className="text-sm text-muted">{table.label}</p>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-4">
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category_id === category.id);
          if (categoryItems.length === 0) return null;
          return (
            <section key={category.id}>
              <h2 className={style.categoryTitle}>{category.name}</h2>
              <div className="flex flex-col gap-3">
                {categoryItems.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    quantity={cart[item.id] ?? 0}
                    onChange={(qty) => setQty(item.id, qty)}
                    style={style}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-muted">아직 등록된 메뉴가 없습니다.</p>
        )}
      </main>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card p-4 shadow-lg">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <button
            onClick={placeOrder}
            disabled={submitting}
            className="flex w-full items-center justify-between rounded-full bg-brand px-5 py-3 font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <span>{submitting ? "주문 중..." : `주문하기 (${cartCount})`}</span>
            <span>{formatPeso(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItemRow({
  item,
  quantity,
  onChange,
  style,
}: {
  item: MenuItem;
  quantity: number;
  onChange: (quantity: number) => void;
  style: (typeof DIGITAL_TEMPLATE_STYLES)[MenuTemplateId];
}) {
  return (
    <div className={style.card}>
      <div className={`relative shrink-0 overflow-hidden bg-background ${style.cardImage}`}>
        {item.photo_url ? (
          <Image src={item.photo_url} alt={item.name} fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs text-muted">
            Menuko
          </span>
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium">{item.name}</p>
        <p className={style.priceText}>{formatPeso(item.price)}</p>
      </div>
      {quantity === 0 ? (
        <button onClick={() => onChange(1)} className={style.addButton}>
          담기
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(quantity - 1)}
            className="h-8 w-8 rounded-full border border-border text-lg"
          >
            −
          </button>
          <span className="w-4 text-center">{quantity}</span>
          <button
            onClick={() => onChange(quantity + 1)}
            className="h-8 w-8 rounded-full border border-border text-lg"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmationView({
  restaurant,
  table,
  confirmation,
  status,
  ad,
  onOrderMore,
}: {
  restaurant: Restaurant;
  table: { id: string; label: string };
  confirmation: Confirmation;
  status: OrderStatus;
  ad: AdContent | null;
  onOrderMore: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <header>
        <p className="font-bold text-brand">{restaurant.name}</p>
        <p className="text-sm text-muted">{table.label}</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">주문 접수됨</h2>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            {ORDER_STATUS_LABEL[status] ?? status}
          </span>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {confirmation.lines.map((line) => (
            <li key={line.id} className="flex justify-between">
              <span>
                {line.name} × {line.quantity}
              </span>
              <span>{formatPeso(line.unitPrice * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
          <span>합계</span>
          <span>{formatPeso(confirmation.total)}</span>
        </div>
      </div>

      {ad && <AdBanner ad={ad} />}

      {(restaurant.payment_qr_url || restaurant.payment_link) && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted">결제는 캐셔에서 확인해 드립니다</p>
          {restaurant.payment_qr_url && (
            <Image
              src={restaurant.payment_qr_url}
              alt="결제 QR"
              width={180}
              height={180}
              className="rounded"
            />
          )}
          {restaurant.payment_link && (
            <a
              href={restaurant.payment_link}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brand underline"
            >
              결제 링크 열기
            </a>
          )}
        </div>
      )}

      <button
        onClick={onOrderMore}
        className="rounded-full border border-brand px-5 py-3 text-center font-medium text-brand transition hover:bg-brand hover:text-brand-foreground"
      >
        메뉴에서 더 담기
      </button>
    </div>
  );
}
