"use client";

import { useEffect, useRef, useState } from "react";
import { UiIcon } from "@/components/ui-icon";

const BOTTOM_THRESHOLD_PX = 24;

// Forces an active read: the Restaurant must open this, scroll all the way
// to the bottom, and press Confirm there before signup will accept their
// agreement (see signup-form.tsx) — not just silently check an unread box.
export function LegalModal({
  title,
  open,
  onClose,
  onConfirm,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const [reachedBottom, setReachedBottom] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Require scrolling again each time the modal is (re)opened, rather than
  // remembering a past scroll from earlier in the session.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReachedBottom(false);
    setProgress(0);
    // If the content is short enough to already fit without scrolling,
    // there will never be a scroll event to detect the bottom — check once
    // after layout settles.
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.clientHeight <= BOTTOM_THRESHOLD_PX) {
      setReachedBottom(true);
      setProgress(1);
    }
  }, [open]);

  if (!open) return null;

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 1);
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD_PX) {
      setReachedBottom(true);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c1410]/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-card shadow-2xl sm:max-h-[85vh] sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
          <h2 className="font-display text-2xl font-bold tracking-[-0.01em]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-muted transition hover:text-foreground"
          >
            <UiIcon name="close" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="h-1 w-full bg-background" aria-hidden>
          <div className="h-full bg-brand transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-6 text-sm leading-relaxed">
          <div className="flex flex-col gap-6">{children}</div>
        </div>

        <div className="border-t border-border p-4 sm:p-5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reachedBottom}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand font-bold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {reachedBottom && <UiIcon name="check" className="h-5 w-5" />}
            I&apos;ve read this — Confirm
          </button>
          {!reachedBottom && (
            <p className="mt-2 text-center text-xs text-muted">Scroll to the end to enable this button.</p>
          )}
        </div>
      </div>
    </div>
  );
}
