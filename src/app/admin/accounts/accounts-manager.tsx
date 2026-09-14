"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { inviteAccount, removeAccount, type InviteAccountState } from "../accounts-actions";

type Account = { id: string; email: string; role: string; created_at: string };

const ROLE_LABEL: Record<string, string> = { owner: "오너", kitchen: "주방", cashier: "캐셔" };
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
                  if (confirm(`${account.email} 계정을 삭제할까요?`)) {
                    removeAccount(account.id).then(() => router.refresh());
                  }
                }}
                className="text-xs text-muted underline"
              >
                삭제
              </button>
            )}
          </div>
        ))}
      </div>

      <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">새 직원 계정 추가</h2>
        <div className="flex flex-wrap gap-2">
          <select
            name="role"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="kitchen">주방</option>
            <option value="cashier">캐셔</option>
          </select>
          <input
            name="email"
            type="email"
            required
            placeholder="이메일"
            className="min-w-40 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            name="password"
            type="text"
            required
            minLength={6}
            placeholder="임시 비밀번호 (6자 이상)"
            className="min-w-40 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state.success && <p className="text-sm text-brand">계정이 생성되었습니다.</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "생성 중..." : "계정 생성"}
        </button>
      </form>
    </div>
  );
}
