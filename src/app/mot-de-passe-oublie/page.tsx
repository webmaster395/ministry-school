"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";

function ForgotForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("erreur") === "lien_expire"
      ? "Ce lien a expiré ou a déjà servi. Demande un nouveau lien ci-dessous."
      : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Le modèle d'e-mail de Supabase mène à /auth/reinitialiser avec un jeton.
    // L'adresse de retour ne sert que si l'ancien modèle est encore en place.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reinitialiser`,
    });

    setLoading(false);

    if (resetError) {
      const message = resetError.message.toLowerCase();
      if (resetError.code === "over_email_send_rate_limit" || message.includes("rate limit")) {
        setError("Trop de demandes en peu de temps. Réessaie dans quelques minutes.");
        return;
      }
      if (message.includes("invalid")) {
        setError("Cette adresse e-mail n'est pas valide. Vérifie ta saisie.");
        return;
      }
    }

    // Même réponse qu'il existe un compte ou non : on ne révèle pas qui est inscrit.
    setSent(true);
  }

  return (
    <AuthShell tagline="Un oubli, ça arrive." motto={["Se découvrir.", "Grandir.", "Servir."]}>
      <Link className="login-back" href="/login">
        <span aria-hidden="true">←</span> Retour à la connexion
      </Link>
      <p className="login-overline">Espace personnel</p>
      <h1>Mot de passe oublié</h1>

      {sent ? (
        <>
          <p className="login-intro">
            Si un compte existe avec l&apos;adresse <strong>{email.trim()}</strong>, un e-mail vient de
            partir avec un lien pour choisir un nouveau mot de passe.
          </p>
          <p className="login-intro">
            Pense à regarder dans tes courriers indésirables. Le lien ne sert qu&apos;une fois et
            expire rapidement.
          </p>
          <Link className="login-submit" href="/login">
            Retour à la connexion <span aria-hidden="true">→</span>
          </Link>
        </>
      ) : (
        <>
          <p className="login-intro">
            Indique l&apos;adresse e-mail de ton compte : nous t&apos;envoyons un lien pour choisir un
            nouveau mot de passe.
          </p>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Adresse e-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="prenom@exemple.fr"
              />
            </label>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Envoi…" : "Recevoir le lien"} <span aria-hidden="true">→</span>
            </button>
          </form>
        </>
      )}

      <p className="login-help">
        Besoin d&apos;aide&nbsp;?{" "}
        <a href="mailto:ministryschool@mlkgrandparis.com">ministryschool@mlkgrandparis.com</a>
      </p>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-foreground" />}>
      <ForgotForm />
    </Suspense>
  );
}
