import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProfilMappEditorPage() {
  // Le proxy Ministry vérifie le rôle super administrateur avant de transmettre
  // cette URL au projet MAPP. L’éditeur MAPP effectue ensuite son propre contrôle.
  redirect("/apps/profil-mapp/admin/restitutions");
}
