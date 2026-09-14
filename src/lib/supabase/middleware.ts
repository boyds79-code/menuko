import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const ROLE_HOME: Record<string, string> = {
  owner: "/admin",
  kitchen: "/kitchen",
  cashier: "/cashier",
};

const PROTECTED_PREFIXES = ["/admin", "/kitchen", "/cashier"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  if (isProtected && user) {
    const { data: account } = await supabase
      .from("accounts")
      .select("role")
      .eq("id", user.id)
      .single();

    const home = account ? ROLE_HOME[account.role] : null;
    const allowed = home && path.startsWith(home);

    if (!home || !allowed) {
      const url = request.nextUrl.clone();
      url.pathname = home ?? "/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
