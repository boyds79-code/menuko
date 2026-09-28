import { redirect } from "next/navigation";

// Account invites moved into the "Invite Kitchen / Cashier Accounts"
// section of the consolidated Settings page — keeps old bookmarks working.
export default function AdminAccountsPage() {
  redirect("/admin/settings");
}
