"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogoLockup } from "@/components/Logo";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";

const MINISTRIES = [
  { slug: "apotre", name: "Apôtre" },
  { slug: "prophete", name: "Prophète" },
  { slug: "evangeliste", name: "Évangéliste" },
  { slug: "pasteur", name: "Pasteur" },
  { slug: "docteur", name: "Docteur" },
];

export default function InscriptionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ministrySlug, setMinistrySlug] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          ministry_slug: ministrySlug,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      const code = signUpError.code ?? "";
      const message = signUpError.message.toLowerCase();

      if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
        setError(
          "Trop de demandes d'inscription en peu de temps. Merci de réessayer dans quelques minutes."
        );
      } else if (code === "email_address_invalid" || message.includes("invalid")) {
        setError("Cette adresse e-mail n'est pas valide. Vérifiez votre saisie.");
      } else if (message.includes("already")) {
        setError("Un compte existe déjà avec cette adresse e-mail.");
      } else if (code === "unexpected_failure" || message.includes("sending") || message.includes("email")) {
        setError(
          "Votre compte n'a pas pu être créé car l'e-mail de confirmation n'a pas pu partir. Réessayez dans un instant, ou écrivez-nous si le problème continue."
        );
      } else {
        setError("L'inscription n'a pas abouti. Vérifiez vos informations et réessayez.");
      }
      return;
    }

    // Selon la configuration, la session peut être ouverte immédiatement
    // ou nécessiter une confirmation par e-mail.
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setSuccess(true);
  }

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center bg-cover bg-center p-4 sm:p-6"
      style={{ backgroundImage: "url('/texture-pastoral.png')" }}
    >
      <div className="grid w-full max-w-[900px] grid-cols-1 overflow-hidden rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] md:grid-cols-[5fr_7fr]">
        {/* PANNEAU GAUCHE : l'ovale de la charte sur fond encre */}
        <div className="flex flex-col items-center justify-center bg-foreground px-8 py-11 text-center">
          <div className="w-full max-w-[280px]">
            <LogoLockup priority />
          </div>
          <p className="label mt-6 text-[11px] font-medium tracking-[0.24em] text-[rgba(251,238,218,0.75)]">
            Grandir • Servir • Impacter
          </p>
          <p className="mt-6 max-w-[240px] text-sm leading-relaxed text-[rgba(251,238,218,0.75)]">
            Rejoignez le parcours de formation et grandissez dans votre appel.
          </p>
        </div>

        {/* PANNEAU DROIT : formulaire sur papier */}
        <div className="flex flex-col justify-center bg-background px-8 py-10 sm:px-11">
          {success ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface">
                <CheckCircle2 className="text-foreground" size={24} />
              </div>
              <h1 className="font-title text-[26px] leading-tight text-foreground">
                Inscription enregistrée
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Un e-mail de confirmation vous a été envoyé. Une fois votre adresse validée, vous
                pourrez vous connecter à votre espace.
              </p>
              <Link
                href="/login"
                className="label mt-6 inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-3.5 text-sm tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221]"
              >
                Aller à la connexion
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <p className="label text-xs font-medium tracking-[0.16em] text-muted">
                  Première inscription
                </p>
                <h1 className="font-title mt-1 text-[28px] leading-tight text-foreground">
                  Créer mon compte
                </h1>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-m-doctoral/40 bg-m-doctoral/[0.08] p-2.5 text-xs text-link">
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <Field id="fullName" label="Nom et prénom" icon={<User size={16} />}>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass("pl-10 pr-3.5")}
                    autoComplete="name"
                  />
                </Field>

                <Field id="email" label="E-mail" icon={<Mail size={16} />}>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass("pl-10 pr-3.5")}
                    placeholder="votre@email.com"
                    autoComplete="email"
                  />
                </Field>

                <div>
                  <label htmlFor="ministry" className={labelClass}>
                    Ministère
                  </label>
                  <select
                    id="ministry"
                    required
                    value={ministrySlug}
                    onChange={(e) => setMinistrySlug(e.target.value)}
                    className={inputClass("px-3.5 cursor-pointer")}
                  >
                    <option value="" disabled>
                      Choisir…
                    </option>
                    {MINISTRIES.map((m) => (
                      <option key={m.slug} value={m.slug}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Field id="password" label="Mot de passe" icon={<Lock size={16} />}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass("pl-10 pr-10")}
                    placeholder="8 caractères minimum"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 p-1 text-[#8b918e] transition hover:text-foreground"
                    aria-label={showPassword ? "Masquer" : "Afficher"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </Field>

                <Field id="confirmPassword" label="Confirmer le mot de passe" icon={<Lock size={16} />}>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass("pl-10 pr-3.5")}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="label mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-[18px] py-3.5 text-sm tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] active:scale-[0.99] disabled:opacity-60"
                >
                  <span>{loading ? "Création du compte..." : "Créer mon compte"}</span>
                  {!loading && <ArrowRight size={14} />}
                </button>

                <p className="pt-1 text-center text-[13px] text-muted">
                  Vous avez déjà un compte ?{" "}
                  <Link href="/login" className="font-medium text-link hover:underline">
                    Se connecter
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const labelClass = "mb-1.5 block text-xs font-medium text-foreground";

function inputClass(extra: string) {
  return `w-full rounded-lg border border-[#ded6c9] bg-[#faf7f1] py-3 text-[15px] text-foreground outline-none transition placeholder:text-[#8b918e] focus:border-foreground focus:ring-1 focus:ring-foreground ${extra}`;
}

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 text-[#8b918e]">{icon}</div>
        {children}
      </div>
    </div>
  );
}
