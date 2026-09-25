/* eslint-disable @next/next/no-img-element -- picto décoratif de la landing */
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "../landing.css";

function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams.get("erreur") === "lien_invalide"
      ? "Ce lien de confirmation n'est plus valide. Connectez-vous ou demandez un nouveau lien."
      : searchParams.get("erreur") === "lien_utilise"
        ? "Ce lien a déjà été utilisé. Si vous avez déjà confirmé votre adresse, connectez-vous directement avec votre e-mail et votre mot de passe."
        : searchParams.get("erreur") === "desactive"
          ? "Ce compte est désactivé. Rapprochez-vous de l'équipe Ministry School."
          : null
  );
  const notice =
    searchParams.get("compte") === "active"
      ? "Votre compte est activé. Connectez-vous avec votre e-mail et votre mot de passe."
      : searchParams.get("mdp") === "modifie"
        ? "Votre mot de passe a été modifié. Connectez-vous avec votre nouveau mot de passe."
        : null;
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("banned")
          ? "Ce compte est désactivé. Rapprochez-vous de l'équipe Ministry School."
          : "Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe."
      );
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <div className="landing login-page">
      <main className="login-shell">
        <section className="login-visual" aria-label="Ministry School">
          <Link className="login-brand" href="/" aria-label="Retour à Ministry School">
            <img src="/landing/ministry-icons-transparent.png" alt="" />
            <span className="login-brand__copy"><span>Ministry School</span><small>MLK Formation</small></span>
          </Link>
          <div className="login-visual__copy">
            <p>Ton parcours continue ici.</p>
            <h2>
              Se découvrir.
              <br />
              Grandir.
              <br />
              Servir.
            </h2>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-form-wrap">
            <Link className="login-back" href="/">
              <span aria-hidden="true">←</span> Retour au site
            </Link>
            <p className="login-overline">Espace personnel</p>
            <h1>Se connecter</h1>
            <p className="login-intro">
              Retrouve ton parcours et les informations liées à Ministry School.
            </p>

            {notice && !error && (
              <p className="login-notice" role="status">
                {notice}
              </p>
            )}
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

              <label>
                <span>Mot de passe</span>
                <span className="login-password">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              <div className="login-options">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Se souvenir de moi</span>
                </label>
                <Link href="/mot-de-passe-oublie">Mot de passe oublié&nbsp;?</Link>
              </div>

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? "Connexion…" : "Se connecter"} <span aria-hidden="true">→</span>
              </button>
            </form>

            <p className="login-help">
              Besoin d&apos;aide&nbsp;?{" "}
              <a href="mailto:ministryschool@mlkgrandparis.com">ministryschool@mlkgrandparis.com</a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-foreground" />}>
      <LoginForm />
    </Suspense>
  );
}
