import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProfilMappEditorPage() {
  redirect("/admin/apps/profil-mapp/results");
}
