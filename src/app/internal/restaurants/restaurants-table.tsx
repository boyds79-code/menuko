"use client";

import { useState } from "react";
import { setRestaurantPlan } from "../actions";
import type { RestaurantPlan } from "@/lib/database.types";

type Restaurant = {
  id: string;
  name: string;
  plan: RestaurantPlan;
  business_type: string;
  created_at: string;
};

export function RestaurantsTable({ restaurants }: { restaurants: Restaurant[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Record<string, RestaurantPlan>>(
    Object.fromEntries(restaurants.map((r) => [r.id, r.plan])),
  );

  async function toggle(restaurant: Restaurant) {
    const next: RestaurantPlan = plans[restaurant.id] === "premium" ? "free" : "premium";
    setBusyId(restaurant.id);
    setPlans((prev) => ({ ...prev, [restaurant.id]: next }));
    await setRestaurantPlan(restaurant.id, next);
    setBusyId(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {restaurants.map((restaurant) => {
        const plan = plans[restaurant.id];
        return (
          <div
            key={restaurant.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
          >
            <div>
              <p className="font-medium">{restaurant.name}</p>
              <p className="text-xs text-muted">
                {restaurant.business_type} · created{" "}
                {new Date(restaurant.created_at).toLocaleDateString("en-PH")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  plan === "premium" ? "bg-brand/10 text-brand" : "bg-background text-muted"
                }`}
              >
                {plan}
              </span>
              <button
                onClick={() => toggle(restaurant)}
                disabled={busyId === restaurant.id}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-brand hover:text-brand disabled:opacity-60"
              >
                {plan === "premium" ? "Downgrade to free" : "Upgrade to premium"}
              </button>
            </div>
          </div>
        );
      })}
      {restaurants.length === 0 && <p className="text-sm text-muted">No restaurants yet.</p>}
    </div>
  );
}
