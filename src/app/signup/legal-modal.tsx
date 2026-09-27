"use client";

// Forces an active read: the Restaurant must open this and press Confirm at
// the bottom before signup will accept their agreement (see signup-form.tsx),
// rather than just silently accepting a pre-checked/unread checkbox.
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
  if (!open) return null;

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

        <div className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed">
          <div className="flex flex-col gap-6">{children}</div>
        </div>

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
          >
            I&apos;ve read this — Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
