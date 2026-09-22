/* eslint-disable @next/next/no-img-element -- picto décoratif de la landing */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "../landing.css";

/**
 * Les cinq sensibilités, avec l'identifiant utilisé par la base et la classe de couleur de la
 * maquette. « Je ne sais pas encore » n'enregistre aucun ministère : la personne le choisira
 * plus tard dans « Mon choix ».
 */
const CHOICES = [
  { value: "apotre", label: "Apostolique", css: "choice-apo" },
  { value: "prophete", label: "Prophétique", css: "choice-pro" },
  { value: "evangeliste", label: "Évangélique", css: "choice-eva" },
  { value: "pasteur", label: "Pastorale", css: "choice-pas" },
  { value: "docteur", label: "Doctorale", css: "choice-doc" },
  { value: "", label: "Je ne sais pas encore", css: "choice-unknown" },
] as const;

export default function InscriptionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
          // Le prénom d'abord : l'application salue la personne par son premier mot
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
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
      router.push("/app");
      router.refresh();
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="landing login-page">
      <main className="login-shell signup-shell">
        <section className="login-visual signup-visual" aria-label="Ministry School">
          <Link className="login-brand" href="/" aria-label="Retour à Ministry School">
            <img src="/landing/ministry-icons-transparent.png" alt="" />
            <span>Ministry School</span>
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

        <section className="login-panel signup-panel">
          <div className="login-form-wrap signup-form-wrap">
            <Link className="login-back" href="/">
              <span aria-hidden="true">←</span> Retour au site
            </Link>

            {success ? (
              <>
                <p className="login-overline">Espace personnel</p>
                <h1>Inscription enregistrée</h1>
                <p className="login-intro">
                  Un e-mail de confirmation t&apos;a été envoyé. Une fois ton adresse validée, tu pourras te
                  connecter à ton espace. Pense à regarder dans tes courriers indésirables si tu ne le
                  vois pas arriver.
                </p>
                <Link className="login-submit" href="/login">
                  Aller à la connexion <span aria-hidden="true">→</span>
                </Link>
              </>
            ) : (
              <>
                <p className="login-overline">Espace personnel</p>
                <h1>Créer un compte</h1>
                <p className="login-intro">
                  Quelques informations suffisent pour préparer ton espace Ministry School.
                </p>

                {error && (
                  <p className="login-error" role="alert">
                    {error}
                  </p>
                )}

                <form className="login-form signup-form" onSubmit={handleSubmit}>
                  <div className="signup-fields">
                    <label>
                      <span>Prénom</span>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                        placeholder="Ton prénom"
                      />
                    </label>
                    <label>
                      <span>Nom</span>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                        placeholder="Ton nom"
                      />
                    </label>
                    <label className="signup-wide">
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
                          autoComplete="new-password"
                          placeholder="8 caractères minimum"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </span>
                    </label>
                    <label>
                      <span>Confirmer le mot de passe</span>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="••••••••"
                      />
                    </label>
                  </div>

                  <fieldset className="ministry-choice">
                    <legend>As-tu une idée de ta sensibilité ministérielle&nbsp;?</legend>
                    <div className="ministry-choice__grid">
                      {CHOICES.map((c) => (
                        <label key={c.value || "inconnue"} className={c.css}>
                          <input
                            type="radio"
                            name="ministry"
                            value={c.value}
                            checked={ministrySlug === c.value}
                            onChange={() => setMinistrySlug(c.value)}
                          />
                          <span>{c.label}</span>
                        </label>
                      ))}
                    </div>
                    <p>Ne t&apos;inquiète pas, tu pourras modifier ce choix à tout moment.</p>
                  </fieldset>

                  <button className="login-submit signup-submit" type="submit" disabled={loading}>
                    {loading ? "Création du compte…" : "Créer mon compte"} <span aria-hidden="true">→</span>
                  </button>
                </form>

                <p className="account-switch">
                  Tu as déjà un compte&nbsp;? <Link href="/login">Se connecter</Link>
                </p>
                <p className="login-help">
                  Besoin d&apos;aide&nbsp;?{" "}
                  <a href="mailto:ministryschool@mlkgrandparis.com">ministryschool@mlkgrandparis.com</a>
                </p>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
