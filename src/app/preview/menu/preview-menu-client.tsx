"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { isMenuColorId, isMenuLayoutId, type MenuColorId, type MenuLayoutId } from "@/lib/menu-templates";
import { OrderClient } from "@/app/order/[qrToken]/order-client";

// Message the Settings page posts into this iframe when the owner taps a
// layout/color chip. Switching in place (instead of reloading the iframe
// with new query params) makes a design change instant — the demo menu and
// its photos are already loaded, only the render changes.
export const PREVIEW_DESIGN_MESSAGE = "menuko:preview-design";

export function PreviewMenuClient({
  initialLayout,
  initialColor,
  ...orderClientProps
}: Omit<ComponentProps<typeof OrderClient>, "menuLayout" | "menuColor" | "preview"> & {
  initialLayout: MenuLayoutId;
  initialColor: MenuColorId;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [color, setColor] = useState(initialColor);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Only the owner's own Settings page (same origin) may drive this.
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: unknown; layout?: unknown; color?: unknown } | null;
      if (!data || data.type !== PREVIEW_DESIGN_MESSAGE) return;
      if (typeof data.layout === "string" && isMenuLayoutId(data.layout)) setLayout(data.layout);
      if (typeof data.color === "string" && isMenuColorId(data.color)) setColor(data.color);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return <OrderClient {...orderClientProps} preview menuLayout={layout} menuColor={color} />;
}
