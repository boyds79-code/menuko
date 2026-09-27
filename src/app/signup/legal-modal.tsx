"use client";

import { useEffect, useRef, useState } from "react";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Require scrolling again each time the modal is (re)opened, rather than
  // remembering a past scroll from earlier in the session.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReachedBottom(false);
    // If the content is short enough to already fit without scrolling,
    // there will never be a scroll event to detect the bottom — check once
    // after layout settles.
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.clientHeight <= BOTTOM_THRESHOLD_PX) {
      setReachedBottom(true);
    }
  }, [open]);

  if (!open) return null;

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD_PX) {
      setReachedBottom(true);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted underline">
            Close
          </button>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed">
          <div className="flex flex-col gap-6">{children}</div>
        </div>

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reachedBottom}
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            I&apos;ve read this — Confirm
          </button>
          {!reachedBottom && (
            <p className="mt-2 text-center text-xs text-muted">Scroll to the bottom to enable this button.</p>
          )}
        </div>
      </div>
    </div>
  );
}
