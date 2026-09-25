"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  House,
  X,
} from "lucide-react";
import MinistryPicto from "@/components/MinistryPicto";
import { markWelcomeSeen } from "@/app/etudiant/actions";

const MINISTRIES_ORDER = [
  { slug: "pasteur", name: "Pasteur", color: "#f19f00", adjective: "pastorale" },
  { slug: "prophete", name: "Prophète", color: "#59c9ca", adjective: "prophétique" },
  { slug: "docteur", name: "Docteur", color: "#e34d1b", adjective: "doctorale" },
  { slug: "evangeliste", name: "Évangéliste", color: "#ee9a9c", adjective: "évangélique" },
  { slug: "apotre", name: "Apôtre", color: "#c9dc6a", adjective: "apostolique" },
] as const;

interface WelcomeModalProps {
  fullName?: string;
  ministrySlug?: string | null;
  ministryName?: string | null;
}

export default function WelcomeModal({
  fullName,
  ministrySlug,
}: WelcomeModalProps) {
  // Affichée seulement aux nouveaux inscrits : la page ne la rend que si elle n'a jamais été vue
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  function handleDismiss() {
    setOpen(false);
    void markWelcomeSeen();
  }

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  const firstName = fullName?.trim().split(" ")[0] || "étudiant";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#27302f]/70 p-3 sm:p-5 backdrop-blur-xs transition-opacity duration-200"
      onClick={handleDismiss}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] border border-border bg-background shadow-[0_24px_64px_rgba(0,0,0,0.32)] transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton Fermer [X] */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fermer"
          className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[#fbeeda] backdrop-blur-xs transition hover:bg-white/25 active:scale-95 cursor-pointer"
        >
          <X size={17} strokeWidth={2.2} />
        </button>

        {/* ================= HEADER CONTRASTÉ ENCRE SOMBRE ================= */}
        <div className="bg-[#27302f] px-6 pb-6 pt-7 text-center">
          {/* Les 5 ministères bien mis en valeur */}
          <div className="mb-3.5 flex items-center justify-center gap-2.5">
            {MINISTRIES_ORDER.map((m) => {
              const isUserMinistry = ministrySlug === m.slug;
              return (
                <div
                  key={m.slug}
                  title={`Sensibilité ${m.adjective}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-[#fffdf9] transition-transform ${
                    isUserMinistry ? "scale-110 ring-2 ring-[#fbeeda] ring-offset-2 ring-offset-[#27302f]" : ""
                  }`}
                >
                  <MinistryPicto slug={m.slug} size={24} />
                </div>
              );
            })}
          </div>

          <p className="font-label text-[10.5px] font-semibold tracking-[0.22em] text-[#d9c9ad] uppercase">
            {step === 1 && "Ministry School"}
            {step === 2 && "Un samedi par mois"}
            {step === 3 && "Votre portail"}
          </p>

          <h2 className="font-title mt-1.5 text-2xl sm:text-[27px] font-normal leading-tight text-[#fbeeda]">
            {step === 1 && `Bienvenue, ${firstName}`}
            {step === 2 && "Votre journée type"}
            {step === 3 && "Tout est là"}
          </h2>
        </div>

        {/* ================= CORPS DÉFILABLE SELON L'ÉTAPE ================= */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {/* ÉCRAN 1 : ACCUEIL & VISION */}
          {step === 1 && (
            <div className="space-y-3.5 text-[14.5px] leading-relaxed text-[#3d4644]">
              <p className="font-semibold text-foreground text-[15.5px]">
                Bonjour et Bienvenue sur Ministry School,
              </p>
              <p>
                Votre compte est prêt.
                <br />
                Pendant cette année de formation, vous allez approfondir votre foi, affermir votre cœur et apprendre à mettre vos dons au service de l&apos;Église.
              </p>
              <p className="text-muted text-[13.5px]">
                Découvrez en deux clics comment est organisée votre formation et le fonctionnement de votre espace personnel.
              </p>
            </div>
          )}

          {/* ÉCRAN 2 : LA JOURNÉE TYPE DU SAMEDI */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 border-b border-border/70 pb-3">
                <span className="h-9 w-1 shrink-0 rounded-full bg-[#8b6fc0]" />
                <b className="font-title min-w-[58px] text-[18px] font-bold text-foreground">9h30</b>
                <div className="text-[13px] leading-snug">
                  <span className="block font-semibold text-foreground">Formation du cœur</span>
                  <span className="text-muted">Travailler sur son être intérieur pour grandir spirituellement.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 border-b border-border/70 pb-3">
                <span className="h-9 w-1 shrink-0 rounded-full bg-[#4a7bc4]" />
                <b className="font-title min-w-[58px] text-[18px] font-bold text-foreground">11h30</b>
                <div className="text-[13px] leading-snug">
                  <span className="block font-semibold text-foreground">Caractère et sensibilité</span>
                  <span className="text-muted">Mieux se connaître et découvrir sa sensibilité ministérielle.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 border-b border-border/70 pb-3">
                <span className="h-9 w-1 shrink-0 rounded-full bg-[#e34d1b]" />
                <b className="font-title min-w-[58px] text-[18px] font-bold text-foreground">14h30</b>
                <div className="text-[13px] leading-snug">
                  <span className="block font-semibold text-foreground">Place à la pratique</span>
                  <span className="text-muted">Mise en situation sur projet ou ateliers de ministère.</span>
                </div>
              </div>

              <div className="mt-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#4b524f]">
                Premier rendez-vous : <strong className="font-semibold text-foreground">samedi 3 octobre 2026</strong>, à MLK Créteil.
              </div>
            </div>
          )}

          {/* ÉCRAN 3 : LES ONGLETS DU PORTAIL (AVEC LES EXACTES ICÔNES DU SITE) */}
          {step === 3 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 border-b border-border/60 pb-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground">
                  <House size={17} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <b className="block text-[13.5px] font-semibold text-foreground">Accueil</b>
                  <span className="block text-[12px] text-muted">Votre prochaine journée de cours, heure par heure.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 border-b border-border/60 pb-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground">
                  <CalendarDays size={17} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <b className="block text-[13.5px] font-semibold text-foreground">Calendrier</b>
                  <span className="block text-[12px] text-muted">Toutes vos dates de formation, jour après jour.</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground">
                  <BookOpen size={17} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <b className="block text-[13.5px] font-semibold text-foreground">Mes cours & Travaux</b>
                  <span className="block text-[12px] text-muted">Supports pédagogiques, audios et devoirs à préparer.</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ================= PIED DE CARTE & NAVIGATION ================= */}
        <div className="border-t border-border-soft bg-surface/40 px-5 pb-5 pt-3.5 sm:px-6">
          {/* Indicateur de progression (dots cliquables) */}
          <div className="mb-3.5 flex justify-center items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStep(1)}
              aria-label="Écran 1"
              className={`h-2 rounded-full transition-all cursor-pointer ${
                step === 1 ? "w-6 bg-[#27302f]" : "w-2 bg-[#d8d1c3] hover:bg-[#b0a897]"
              }`}
            />
            <button
              type="button"
              onClick={() => setStep(2)}
              aria-label="Écran 2"
              className={`h-2 rounded-full transition-all cursor-pointer ${
                step === 2 ? "w-6 bg-[#27302f]" : "w-2 bg-[#d8d1c3] hover:bg-[#b0a897]"
              }`}
            />
            <button
              type="button"
              onClick={() => setStep(3)}
              aria-label="Écran 3"
              className={`h-2 rounded-full transition-all cursor-pointer ${
                step === 3 ? "w-6 bg-[#27302f]" : "w-2 bg-[#d8d1c3] hover:bg-[#b0a897]"
              }`}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center gap-2.5">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-3 text-xs font-medium text-muted hover:text-foreground transition cursor-pointer"
              >
                Passer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : 1))}
                className="py-2.5 px-3 text-xs font-medium text-muted hover:text-foreground transition cursor-pointer"
              >
                Retour
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 2 | 3) : 3))}
                className="flex-1 rounded-full bg-[#27302f] py-3 px-4 text-center font-label text-[12px] font-bold uppercase tracking-[0.14em] text-[#fbeeda] shadow-sm transition hover:bg-[#1b2221] active:scale-[0.99] cursor-pointer"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 rounded-full bg-[#27302f] py-3 px-4 text-center font-label text-[12px] font-bold uppercase tracking-[0.14em] text-[#fbeeda] shadow-sm transition hover:bg-[#1b2221] active:scale-[0.99] cursor-pointer"
              >
                C&apos;est parti
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
