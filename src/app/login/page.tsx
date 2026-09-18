"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogoLockup } from "@/components/Logo";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

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
      : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center bg-cover bg-center p-4 sm:p-6"
      style={{ backgroundImage: "url('/texture-pastoral.png')" }}
    >
      <div className="grid w-full max-w-[820px] grid-cols-1 overflow-hidden rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] md:grid-cols-[5fr_7fr]">
        {/* PANNEAU GAUCHE : l'ovale de la charte sur fond encre */}
        <div className="flex flex-col items-center justify-center bg-foreground px-8 py-11 text-center">
          <div className="w-full max-w-[280px]">
            <LogoLockup priority />
          </div>
          <p className="label mt-6 text-[11px] font-medium tracking-[0.24em] text-[rgba(251,238,218,0.75)]">
            Grandir • Servir • Impacter
          </p>
        </div>

        {/* PANNEAU DROIT : formulaire sur papier */}
        <div className="flex flex-col justify-center bg-background px-8 py-10 sm:px-11">
          <div className="mb-6">
            <p className="label text-xs font-medium tracking-[0.16em] text-muted">Bienvenue sur</p>
            <h1 className="font-title mt-1 text-[34px] leading-tight text-foreground">
              Ministry School
            </h1>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-m-doctoral/40 bg-m-doctoral/[0.08] p-2.5 text-xs text-link">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-foreground">
                E-mail
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-3.5 text-[#8b918e]">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#ded6c9] bg-[#faf7f1] py-3 pl-10 pr-3.5 text-[15px] text-foreground outline-none transition placeholder:text-[#8b918e] focus:border-foreground focus:ring-1 focus:ring-foreground"
                  placeholder="votre@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-foreground">
                Mot de passe
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-3.5 text-[#8b918e]">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#ded6c9] bg-[#faf7f1] py-3 pl-10 pr-10 text-[15px] text-foreground outline-none transition placeholder:text-[#8b918e] focus:border-foreground focus:ring-1 focus:ring-foreground"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 p-1 text-[#8b918e] transition hover:text-foreground"
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="label flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-[18px] py-3.5 text-sm tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] active:scale-[0.99] disabled:opacity-60"
            >
              <span>{loading ? "Connexion..." : "Se connecter"}</span>
              {!loading && <ArrowRight size={14} />}
            </button>

            {/* Options */}
            <div className="flex items-center justify-between pt-1 text-[13px]">
              <label className="flex cursor-pointer select-none items-center gap-1.5 text-muted">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-[#ded6c9] accent-[#27302f]"
                />
                <span>Se souvenir de moi</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  alert(
                    "Pour réinitialiser votre mot de passe, veuillez contacter l'administration de Ministry School."
                  )
                }
                className="font-medium text-link hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Première inscription */}
            <div className="mt-1 border-t border-border-soft pt-4 text-center text-[13px] text-muted">
              Première fois ici ?{" "}
              <Link href="/inscription" className="font-medium text-link hover:underline">
                Créer mon compte
              </Link>
            </div>
          </form>
        </div>
      </div>
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
