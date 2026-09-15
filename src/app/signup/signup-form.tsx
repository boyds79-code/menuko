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
          Restaurant name
        </label>
        <input
          id="restaurantName"
          name="restaurantName"
          required
          className="rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-brand"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Business type</span>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="businessType" value="restaurant" defaultChecked />
            Restaurant
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="businessType" value="cafe" />
            Cafe
          </label>
        </div>
        <span className="text-xs text-muted">
          You can change this later in restaurant settings. It&apos;s used to target cross-promotion ads.
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
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
          Password
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
        {pending ? "Signing up..." : "Get started for free"}
      </button>
    </form>
  );
}
