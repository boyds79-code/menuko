"use client";

import { useLayoutEffect, useState } from "react";
import { MenuBookIntro } from "./MenuBookIntro";

const SEEN_KEY = "menuko:seenIntro";

// Shows the menu-book scroll intro once per browser, ever. Renders nothing
// during SSR/first paint (so repeat visitors — the common case — get zero
// layout shift); a layout effect flips it on before paint for anyone who
// hasn't seen it yet, and marks it seen right away so a mid-scroll refresh
// doesn't bring it back.
export function IntroBookGate() {
  const [showIntro, setShowIntro] = useState(false);

  useLayoutEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) {
        window.localStorage.setItem(SEEN_KEY, "1");
        // Browser-only check that can't run during SSR — not a render loop.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowIntro(true);
      }
    } catch {
      // Private browsing / storage disabled — just skip the intro rather
      // than risk showing it on every load.
    }
  }, []);

  if (!showIntro) return null;
  return <MenuBookIntro />;
}
