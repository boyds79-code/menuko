"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { inviteAccount, removeAccount, type InviteAccountState } from "../accounts-actions";

type Account = { id: string; email: string; role: string; created_at: string };

const ROLE_LABEL: Record<string, string> = { owner: "Owner", kitchen: "Kitchen", cashier: "Cashier" };
const initialState: InviteAccountState = { error: null, success: false };

export function AccountsManager({ initialAccounts }: { initialAccounts: Account[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(inviteAccount, initialState);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {initialAccounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <span>
              <span className="font-medium">{ROLE_LABEL[account.role] ?? account.role}</span>{" "}
              <span className="text-muted">{account.email}</span>
            </span>
            {account.role !== "owner" && (
              <button
                onClick={() => {
                  if (confirm(`Delete the account ${account.email}?`)) {
                    removeAccount(account.id).then(() => router.refresh());
                  }
                }}
                className="text-xs text-muted underline"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Add a staff account</h2>
        <div className="flex flex-wrap gap-2">
          <select
            name="role"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="kitchen">Kitchen</option>
            <option value="cashier">Cashier</option>
          </select>
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="min-w-40 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            name="password"
            type="text"
            required
            minLength={6}
            placeholder="Temporary password (6+ characters)"
            className="min-w-40 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state.success && <p className="text-sm text-brand">Account created.</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Creating..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
