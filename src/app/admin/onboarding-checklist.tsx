import Link from "next/link";
import { completeOnboarding } from "./onboarding-actions";

type Step = {
  label: string;
  hint: string;
  href: string;
  done: boolean;
  optional?: boolean;
};

// A getting-started checklist for a brand-new owner — the spec's "easy
// onboarding" pitch doesn't mean anything if the owner lands on an empty
// /admin/menu page with no idea what to do first. Pure server component
// (native <details> for collapse, a server-action-bound <form> for Save)
// so it needs no client JS of its own; each step just links to the existing
// admin page that already does the work — this only adds the guided order,
// progress state, and a final explicit "done" action.
export function OnboardingChecklist({
  hasLogo,
  hasAddress,
  categoryCount,
  itemCount,
  tableCount,
  staffCount,
}: {
  hasLogo: boolean;
  hasAddress: boolean;
  categoryCount: number;
  itemCount: number;
  tableCount: number;
  staffCount: number;
}) {
  const steps: Step[] = [
    {
      label: "Restaurant name & logo",
      hint: hasLogo
        ? "Name, business type, and logo are set."
        : "Name and business type are set from signup — add a logo if you have one (optional).",
      href: "/admin/settings",
      done: true,
    },
    {
      label: "Restaurant address",
      hint: "Used to confirm you're on-site before approving a customer's cancel/change request, so notifications aren't sent while you're away.",
      href: "/admin/settings",
      done: hasAddress,
    },
    {
      label: "Create a menu category",
      hint: "Group your menu, e.g. Noodles, Drinks, Sides.",
      href: "/admin",
      done: categoryCount > 0,
    },
    {
      label: "Add a menu item",
      hint: "Add at least one dish with a price so customers have something to order.",
      href: "/admin",
      done: itemCount > 0,
    },
    {
      label: "Add a table",
      hint: "Each table gets its own QR code automatically — no separate step to print it, just open the table to view it.",
      href: "/admin/tables",
      done: tableCount > 0,
    },
    {
      label: "Invite kitchen/cashier accounts",
      hint: "Optional — the free plan includes 1 kitchen + 1 cashier account. Skip this if you're running it solo for now.",
      href: "/admin/accounts",
      done: staffCount > 0,
      optional: true,
    },
  ];

  const requiredSteps = steps.filter((s) => !s.optional);
  const requiredDone = requiredSteps.filter((s) => s.done).length;
  const allRequiredDone = requiredDone === requiredSteps.length;

  return (
    <div className="mx-4 mt-4 rounded-xl border border-brand/30 bg-brand/5">
      <details open={!allRequiredDone}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">
            {allRequiredDone ? "✓ Getting started" : "Getting started"}
          </span>
          <span className="text-xs text-muted">
            {requiredDone} / {requiredSteps.length} steps done
          </span>
        </summary>
        <ul className="flex flex-col gap-2 px-4 pb-4">
          {steps.map((step, i) => {
            const unlocked = steps.slice(0, i).every((s) => s.done);
            const rowContent = (
              <>
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      step.done ? "bg-brand text-brand-foreground" : "border border-border text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {step.label}
                      {step.optional && <span className="ml-1.5 text-xs font-normal text-muted">(optional)</span>}
                      {step.done && <span className="ml-1.5 text-xs font-semibold text-brand">Done</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {unlocked ? step.hint : "Finish the step above first."}
                    </p>
                  </div>
                </div>
                {unlocked ? (
                  <span className="shrink-0 rounded-full border border-brand px-3 py-1 text-xs font-medium text-brand transition group-hover:bg-brand group-hover:text-brand-foreground">
                    {step.done ? "View" : "Go"}
                  </span>
                ) : (
                  <span
                    title="Finish the step above first"
                    className="shrink-0 cursor-not-allowed rounded-full border border-border px-3 py-1 text-xs font-medium text-muted"
                  >
                    Locked
                  </span>
                )}
              </>
            );
            return (
              <li key={step.label}>
                {unlocked ? (
                  <Link
                    href={step.href}
                    className="group flex items-start justify-between gap-3 rounded-lg bg-background p-3 transition hover:bg-brand/5"
                  >
                    {rowContent}
                  </Link>
                ) : (
                  <div className="flex items-start justify-between gap-3 rounded-lg bg-background p-3 opacity-50">
                    {rowContent}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <form action={completeOnboarding} className="flex flex-col gap-2 border-t border-brand/20 px-4 py-4">
          <button
            type="submit"
            disabled={!allRequiredDone}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save and finish setup
          </button>
          {!allRequiredDone && (
            <span className="text-xs text-muted">Finish every required step above to enable this.</span>
          )}
        </form>
      </details>
    </div>
  );
}
