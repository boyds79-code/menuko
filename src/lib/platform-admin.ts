import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Separate from requireStaff/accounts entirely — a platform admin doesn't
// belong to any restaurant, they operate Menuko itself. Gated by an email
// allowlist (env var) rather than a DB role, since this is a single-person
// operator tool for now, not a feature restaurants sign up for.
export async function requirePlatformAdmin(): Promise<{ email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const allowlist = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!allowlist.includes(user.email.toLowerCase())) {
    redirect("/login");
  }

  return { email: user.email };
}
