import { redirect } from "next/navigation";

// Menu management moved into the "Menu Setting" section of the consolidated
// Settings page — this keeps old bookmarks/links working.
export default function AdminMenuPage() {
  redirect("/admin/settings");
}
