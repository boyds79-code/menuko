import { createContext, use, useEffect, useState, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AccountRole } from "@/lib/database.types";

export type StaffAccount = {
  role: AccountRole;
  restaurantId: string;
  restaurantName: string;
};

type SessionContextValue = {
  session: Session | null;
  account: StaffAccount | null;
  // true while we don't yet know session state, or (once signed in) while
  // we're still resolving the account/role row.
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error("useSession must be used within a <SessionProvider>");
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      // Nothing to fetch — don't setState here, just skip. `account` below
      // is exposed as null-when-signed-out at the point of use instead, so
      // this effect never needs to synchronously reset state itself.
      return;
    }

    let cancelled = false;
    // Flips the loading spinner on immediately, before the async fetch
    // below resolves — a deliberate, necessary render (there'd be no
    // loading indicator otherwise), not the accidental-extra-render
    // footgun this rule is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountLoading(true);

    supabase
      .from("accounts")
      .select("role, restaurant_id, restaurants ( name )")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) {
          setAccount(null);
        } else {
          const restaurant = Array.isArray(data.restaurants)
            ? data.restaurants[0]
            : data.restaurants;
          setAccount({
            role: data.role,
            restaurantId: data.restaurant_id,
            restaurantName: restaurant?.name ?? "",
          });
        }
        setAccountLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  return (
    <SessionContext.Provider
      value={{
        session,
        account: session ? account : null,
        isLoading: !sessionLoaded || (!!session && accountLoading),
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
