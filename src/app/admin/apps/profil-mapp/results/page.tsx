import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProfilMappResultsPage() {
  redirect("/apps/profil-mapp/admin/participants");
}
