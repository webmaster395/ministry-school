"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error: string | null };

/** Messages de Supabase sur le nouveau mot de passe, en clair. */
function passwordError(code: string | undefined, message: string) {
  if (code === "same_password" || message.includes("different from the old")) {
    return "Ce mot de passe est celui que tu utilises déjà. Choisis-en un autre.";
  }
  if (code === "weak_password" || message.includes("weak")) {
    return "Ce mot de passe est trop simple. Choisis-en un plus long ou plus varié.";
  }
  return "Le mot de passe n'a pas pu être enregistré. Réessaie dans un instant.";
}

/**
 * Enregistre le nouveau mot de passe. Le jeton de l'e-mail n'est échangé qu'ici, au clic :
 * les messageries qui ouvrent les liens à l'avance ne peuvent pas le consommer avant la personne.
 * Sans jeton, il faut une session déjà ouverte (retour par /auth/callback, ou nouvel essai).
 */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = (formData.get("password") as string | null) ?? "";
  const confirm = (formData.get("confirm") as string | null) ?? "";
  const tokenHash = formData.get("token_hash") as string | null;

  // Vérifier avant d'échanger le jeton, pour qu'une faute de frappe ne le brûle pas
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };

  const supabase = await createClient();

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) redirect("/mot-de-passe-oublie?erreur=lien_expire");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/mot-de-passe-oublie?erreur=lien_expire");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const message = passwordError(error.code, error.message.toLowerCase());
    // Le jeton est consommé : la session ouverte permet de réessayer sans lien
    if (tokenHash) redirect(`/auth/reinitialiser?erreur=${encodeURIComponent(message)}`);
    return { error: message };
  }

  // Comme à l'activation du compte : on se reconnecte soi-même avec le nouveau mot de passe
  await supabase.auth.signOut();
  redirect("/login?mdp=modifie");
}
