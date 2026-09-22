"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirme l'adresse e-mail quand la personne clique sur le bouton de la page /auth/confirm.
 * Le jeton n'est consommé qu'ici : les outils de sécurité des messageries qui « visitent »
 * le lien de l'e-mail à l'avance ne peuvent pas le brûler avant la personne.
 */
export async function confirmEmail(formData: FormData) {
  const tokenHash = formData.get("token_hash") as string | null;
  const type = (formData.get("type") as string | null) === "recovery" ? "recovery" : "email";

  if (!tokenHash) redirect("/login?erreur=lien_invalide");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    // Jeton déjà utilisé ou expiré : si une session existe déjà, le compte est bien activé.
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/app");
    redirect("/login?erreur=lien_utilise");
  }

  redirect("/app");
}
