/* eslint-disable @next/next/no-img-element -- picto décoratif de la landing */
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  isLoginRateLimited,
  LOGIN_RETRY_COOLDOWN_MS,
  loginErrorMessage,
  normalizeLoginEmail,
} from "@/lib/auth/login-errors";
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
  const [slowConnection, setSlowConnection] = useState(false);
  const [retryBlocked, setRetryBlocked] = useState(false);
  const submitInFlight = useRef(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (slowTimer.current) clearTimeout(slowTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  function stopPendingState() {
    if (slowTimer.current) clearTimeout(slowTimer.current);
    slowTimer.current = null;
    submitInFlight.current = false;
    setSlowConnection(false);
    setLoading(false);
  }

  function blockImmediateRetry() {
    setRetryBlocked(true);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => {
      setRetryBlocked(false);
      retryTimer.current = null;
    }, LOGIN_RETRY_COOLDOWN_MS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Le state React n'est pas synchrone. Ce verrou empêche deux taps rapides de
    // lancer deux POST /auth/v1/token avant que le bouton ne soit désactivé.
    if (submitInFlight.current || retryBlocked) return;
    submitInFlight.current = true;
    setError(null);
    setSlowConnection(false);
    setLoading(true);
    slowTimer.current = setTimeout(() => setSlowConnection(true), 8_000);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizeLoginEmail(email),
        password,
      });

      if (signInError) {
        if (isLoginRateLimited(signInError)) blockImmediateRetry();
        setError(loginErrorMessage(signInError));
        stopPendingState();
        return;
      }

      // Le suivi statistique est écrit après l'affichage, de façon étalée, afin
      // de ne pas alourdir la transaction Auth qui vient d'aboutir.
      sessionStorage.setItem("ms:just-signed-in", "1");

      // Les délégations saisies avant la première connexion sont rattachées une
      // seule fois ici. Une panne de ce RPC optionnel ne doit pas détruire la
      // session Auth qui vient d'être obtenue ni provoquer un second /token.
      try {
        await supabase.rpc("claim_delegations");
      } catch {
        // La session Auth est déjà valide. Ne jamais relancer /token parce que
        // le rattachement optionnel a rencontré une coupure réseau.
      }
      if (slowTimer.current) clearTimeout(slowTimer.current);
      slowTimer.current = null;
      router.replace("/etudiant");
    } catch (failure) {
      blockImmediateRetry();
      setError(loginErrorMessage(failure));
      stopPendingState();
    }
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
            {loading && slowConnection && (
              <p className="login-notice" role="status">
                La connexion est toujours en cours. Ne recharge pas la page : aucune seconde tentative n’est envoyée.
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

              <button className="login-submit" type="submit" disabled={loading || retryBlocked}>
                {loading ? "Connexion…" : retryBlocked ? "Patiente quelques instants…" : "Se connecter"} <span aria-hidden="true">→</span>
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
