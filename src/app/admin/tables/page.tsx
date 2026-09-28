import { redirect } from "next/navigation";

// Table management moved into the "Table Setting" section of the
// consolidated Settings page — this keeps old bookmarks/links working.
export default function AdminTablesPage() {
  redirect("/admin/settings");
}
