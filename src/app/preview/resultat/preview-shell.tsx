"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import CompleteExperience, { type PreviewProfileCode } from "./complete-experience";
import { normalizeIntegralV10 } from "@/lib/editorial/integral-v10";
import styles from "./result-preview.module.css";
import type { IdentityInterpretation } from "@/lib/results/identity-interpretation";
import { withMappAssetPath } from "@/lib/routing/base-path";
import { SaveProfileMenu } from "./save-profile-menu";

const source = normalizeIntegralV10();

const codes: PreviewProfileCode[] = ["conquerant", "communiquant", "facilitateur", "analyste"];
const resultColors: Record<PreviewProfileCode, string> = { conquerant: "var(--results-conquerant)", communiquant: "var(--results-communiquant)", facilitateur: "var(--results-facilitateur)", analyste: "var(--results-analyste)" };
const landscapes: Record<PreviewProfileCode, string> = {
  conquerant: withMappAssetPath("/images/profile-cards/paul-hero-hd-v2.webp"),
  communiquant: withMappAssetPath("/images/profile-cards/pierre-hero-hd-v2.webp"),
  facilitateur: withMappAssetPath("/images/profile-cards/abraham-hero-hd-v2.webp"),
  analyste: withMappAssetPath("/images/profile-cards/moise-hero-hd-v2.webp"),
};
const characters: Record<PreviewProfileCode, string> = { conquerant: "l’apôtre Paul", communiquant: "l’apôtre Pierre", facilitateur: "Abraham", analyste: "Moïse" };
const heroPhrases: Record<PreviewProfileCode, string> = {
  conquerant: "Là où d'autres hésitent, tu oses avancer.",
  communiquant: "Tu sais transformer une rencontre en opportunité.",
  facilitateur: "Tu fais grandir les autres sans chercher la lumière.",
  analyste: "Tu vois les détails qui font toute la différence.",
};

export default function PreviewShell({
  initialProfile = "conquerant",
  initialSecondary = "communiquant",
  initialPage = 1,
  participantName = "Rose-Alice",
  scores,
  pressureScores,
  pressureProfile,
  pressureSecondary,
  pressureTieNote,
  tieNote,
  identityNarrative,
  showControls = true,
  isPreview = true,
  attemptId,
  revisionId,
  accessToken,
  previewViewport,
}: {
  initialProfile?: PreviewProfileCode;
  initialSecondary?: PreviewProfileCode;
  initialPressure?: PreviewProfileCode;
  initialPage?: number;
  participantName?: string;
  scores?: Partial<Record<PreviewProfileCode, number | null>>;
  pressureScores?: Partial<Record<PreviewProfileCode, number | null>>;
  pressureProfile?: PreviewProfileCode | null;
  pressureSecondary?: PreviewProfileCode | null;
  pressureTieNote?: string | null;
  tieNote?: string | null;
  identityNarrative?: IdentityInterpretation | null;
  showControls?: boolean;
  isPreview?: boolean;
  attemptId?: string;
  revisionId?: string;
  accessToken?: string;
  previewViewport?: number;
}) {
  const [profileCode, setProfileCode] = useState<PreviewProfileCode>(initialProfile);
  const [secondaryCode, setSecondaryCode] = useState<PreviewProfileCode>(initialSecondary === initialProfile ? (codes.find((code) => code !== initialProfile) ?? "conquerant") : initialSecondary);
  const profile = source.profiles[profileCode];
  const secondaryOptions = useMemo(() => codes.filter((code) => code !== profileCode), [profileCode]);
  const illustrativePressureScores = useMemo(() => {
    if (!isPreview || pressureScores) return pressureScores;
    return Object.fromEntries(codes.map((code) => [code, code === profileCode ? 40 : code === secondaryCode ? 30 : code === "facilitateur" ? 20 : 10])) as Record<PreviewProfileCode, number>;
  }, [isPreview, pressureScores, profileCode, secondaryCode]);

  function changeProfile(code: PreviewProfileCode) {
    setProfileCode(code);
    if (code === secondaryCode) setSecondaryCode(codes.find((candidate) => candidate !== code) ?? "conquerant");
  }

  return <main className={`${styles.page} results-design-system`}>
    {showControls && <aside className={styles.previewControls} aria-label="Contrôles de la preview brouillon">
      <strong>Preview éditoriale · contenus draft</strong>
      <label>Profil<select value={profileCode} onChange={(event) => changeProfile(event.target.value as PreviewProfileCode)}>{codes.map((code) => <option value={code} key={code}>{source.profiles[code].name}</option>)}</select></label>
      <label>Secondaire<select value={secondaryCode} onChange={(event) => setSecondaryCode(event.target.value as PreviewProfileCode)}>{secondaryOptions.map((code) => <option value={code} key={code}>{source.profiles[code].name}</option>)}</select></label>
      <span>Aperçu visuel : les chiffres sous pression sont fictifs. Les résultats réels utilisent exclusivement les scores enregistrés.</span>
    </aside>}
    <section id="top" className={styles.hero}>
      <header className={styles.topbar}><a className={styles.brand} href="#top" aria-label="Profil MAPP, haut de page" style={{ "--brand-profile-color": resultColors[profileCode] } as React.CSSProperties}><span className={styles.brandMarks} aria-hidden="true"><b /><b /><b /><b /></span><span><small>Profil</small> <strong>mapp<span className={styles.brandDot}>.</span></strong></span><i aria-hidden="true" /> <small>Église MLK</small></a><SaveProfileMenu attemptId={attemptId} revisionId={revisionId} accessToken={accessToken} isPreview={isPreview} /></header>
      <Image src={landscapes[profileCode]} alt="Paysage associé au profil" fill priority sizes="100vw" quality={90} />
      <div className={styles.heroVeil} />
      <div className={styles.heroContent}><p className={styles.kicker}>{participantName}</p><h1>Ton profil est <em className={styles.profileName} style={{ "--hero-profile-color": resultColors[profileCode] } as React.CSSProperties}>{profile.name}</em>,<br /> comme <strong>{characters[profileCode]}</strong>.</h1><p className={styles.asset}>{heroPhrases[profileCode]}</p></div>
      <a href="#results" className={styles.discover}>Découvrir</a>
    </section>
    <CompleteExperience profileCode={profileCode} secondaryCode={secondaryCode} initialPage={initialPage} scores={scores} pressureScores={illustrativePressureScores} pressureProfile={isPreview ? profileCode : pressureProfile} pressureSecondary={isPreview ? secondaryCode : pressureSecondary} pressureTieNote={pressureTieNote} tieNote={tieNote} identityNarrative={identityNarrative} isPreview={isPreview} attemptId={attemptId} revisionId={revisionId} previewViewport={isPreview ? previewViewport : undefined} />
  </main>;
}
