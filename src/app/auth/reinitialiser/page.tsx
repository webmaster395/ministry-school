import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AuthShell from "@/components/AuthShell";
import ResetForm from "./ResetForm";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — Ministry School",
  robots: { index: false },
};

/**
 * Arrivée du lien « mot de passe oublié ». On y choisit le nouveau mot de passe ; le jeton
 * n'est consommé qu'à l'enregistrement (voir actions.ts).
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; erreur?: string }>;
}) {
  const { token_hash, erreur } = await searchParams;

  // Sans jeton, il faut une session : retour de l'ancien lien par /auth/callback, ou nouvel essai
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canReset = !!token_hash || !!user;

  return (
    <AuthShell tagline="Un nouveau départ." motto={["Se découvrir.", "Grandir.", "Servir."]}>
      <p className="login-overline">Espace personnel</p>
      <h1>Nouveau mot de passe</h1>

      {canReset ? (
        <>
          <p className="login-intro">
            Choisis ton nouveau mot de passe. Tu seras ensuite connecté directement à ton espace.
          </p>
          <ResetForm tokenHash={token_hash ?? null} initialError={erreur ?? null} />
        </>
      ) : (
        <>
          <p className="login-intro">
            Ce lien est incomplet ou a expiré. Demande un nouveau lien pour choisir ton mot de passe.
          </p>
          <Link className="login-submit" href="/mot-de-passe-oublie">
            Demander un nouveau lien <span aria-hidden="true">→</span>
          </Link>
        </>
      )}
    </AuthShell>
  );
}
