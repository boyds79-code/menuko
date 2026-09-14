"use client";

import { useActionState } from "react";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = { error: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="restaurantName" className="text-sm font-medium">
          매장 이름
        </label>
        <input
          id="restaurantName"
          name="restaurantName"
          required
          className="rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-brand"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">업종</span>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="businessType" value="restaurant" defaultChecked />
            식당
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="businessType" value="cafe" />
            카페
          </label>
        </div>
        <span className="text-xs text-muted">
          나중에 매장 설정에서 바꿀 수 있어요. 크로스 프로모션 광고 노출 기준이 됩니다.
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-brand"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-brand"
        />
      </div>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-4 py-2 font-medium text-brand-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "가입 중..." : "무료로 시작하기"}
      </button>
    </form>
  );
}
