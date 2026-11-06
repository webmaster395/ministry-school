"use client";

import { useState, type CSSProperties } from "react";
import editorial from "@/lib/editorial/profil-mapp-page-04-avec-les-autres-v2.json";
import { BodyText, Eyebrow, PageIntro, SectionIntro } from "@/components/results/typography";
import { withMappAssetPath } from "@/lib/routing/base-path";
import styles from "./preview.module.css";

type Code = "D" | "I" | "S" | "C";
const order: Code[] = ["D", "I", "S", "C"];
const images: Record<Code, string> = {
  D: withMappAssetPath("/images/characters/paul.png"),
  I: withMappAssetPath("/images/characters/pierre.png"),
  S: withMappAssetPath("/images/characters/abraham.png"),
  C: withMappAssetPath("/images/characters/moise.png"),
};
const biblicalCharacters: Record<Code, string> = {
  D: "Paul",
  I: "Pierre",
  S: "Abraham",
  C: "Moïse",
};
const keywords: Record<Code, string[]> = {
  D: ["Décision", "Action", "Défi", "Autonomie", "Résultats"],
  I: ["Échange", "Enthousiasme", "Influence", "Créativité", "Relations"],
  S: ["Écoute", "Stabilité", "Patience", "Soutien", "Harmonie"],
  C: ["Analyse", "Précision", "Logique", "Méthode", "Fiabilité"],
};
const profileIntroductions: Record<Code, string> = {
  D: "Il aime aller droit au but, décider et faire avancer les choses. Il valorise l'autonomie, les défis et les résultats concrets, sans pour autant ignorer les personnes ni la qualité des échanges.",
  I: "Il aime échanger, partager ses idées et créer de l'enthousiasme autour de lui. Il accorde de l'importance aux relations, à la créativité et à la reconnaissance, sans pour autant manquer de sérieux ou de constance.",
  S: "Il aime construire des relations de confiance, écouter et avancer dans un climat stable. Il accorde de l'importance à la coopération, à la patience et à l'harmonie, sans pour autant manquer d'avis ou d'initiative.",
  C: "Il aime comprendre avant d'agir, examiner les faits et prendre des décisions réfléchies. Il accorde de l'importance à la précision, à la cohérence et à la fiabilité, sans pour autant manquer de spontanéité ou de sensibilité.",
};
const relationContributions: Record<Code, string> = {
  D: "Tu apportes de l'élan, de la clarté et une capacité à faire avancer les décisions.",
  I: "Tu apportes de l'enthousiasme, des idées et une énergie qui facilite les échanges.",
  S: "Tu apportes de l'écoute, de la stabilité et une attention sincère aux besoins de chacun.",
  C: "Tu apportes de la précision, du discernement et des repères fiables dans les échanges.",
};
const relationAdjustments: Record<Code, string> = {
  D: "Tu peux encore gagner en impact en laissant aux autres l'espace nécessaire pour contribuer.",
  I: "Tu peux encore gagner en justesse en donnant autant de place à l'écoute qu'à l'expression.",
  S: "Tu peux encore gagner en équilibre en affirmant plus directement tes attentes et tes limites.",
  C: "Tu peux encore gagner en fluidité en partageant tes conclusions sans attendre que tout soit parfaitement défini.",
};
const relationshipApproaches: Record<Code, string> = {
  D: "Tu cherches souvent à aller droit au but, à clarifier la direction et à faire avancer les échanges.",
  I: "Tu cherches souvent à créer un échange vivant, à partager tes idées et à faire circuler l'enthousiasme.",
  S: "Tu cherches souvent à comprendre les personnes, à préserver la confiance et à construire des relations stables.",
  C: "Tu cherches souvent à comprendre avant de te positionner et tu accordes de l'importance à la cohérence des échanges.",
};
const secondaryInfluences: Record<Code, string> = {
  D: "Ton côté Conquérant peut aussi t'amener à décider plus vite, à poser un cap et à rechercher des résultats concrets.",
  I: "Ton côté Communiquant peut aussi t'amener à rechercher le contact, à partager tes idées et à créer du lien.",
  S: "Ton côté Facilitateur peut aussi t'amener à privilégier l'écoute, la coopération et un climat relationnel stable.",
  C: "Ton côté Analyste peut aussi t'amener à vérifier les faits, à structurer les échanges et à rechercher plus de précision.",
};

function ProfileSection({ code, portrait }: { code: Code; portrait: (typeof editorial.configurations)["DI"]["portraits"]["D"] }) {
  const [openId, setOpenId] = useState<string | null>(portrait.accordions[0]?.id ?? null);
  const profile = editorial.profiles[code];
  return <section id={profile.anchor} className={styles.profileSection} data-profile={code} style={{ "--section-accent": profile.color } as CSSProperties} aria-labelledby={`${profile.anchor}-heading`}>
    <div className={styles.sectionHeading}>
      <Eyebrow>{profile.name}</Eyebrow>
      <h2 id={`${profile.anchor}-heading`}>Avec un {profile.name}.</h2>
      <SectionIntro>{profileIntroductions[code]}</SectionIntro>
    </div>
    <div className={styles.colorBlock}>
      <div className={styles.sectionLayout}>
        <figure className={styles.portrait}>
          <img src={images[code]} alt={`${biblicalCharacters[code]}, personnage biblique associé au profil ${profile.name}`} loading="eager" decoding="async" />
          <figcaption>{keywords[code].map(keyword => <span key={keyword}>{keyword}</span>)}</figcaption>
        </figure>
        <div className={styles.accordions}>{portrait.accordions.map((item, index) => {
          const isOpen = openId === item.id;
          const panelId = `${profile.anchor}-${item.id}`;
          return <section className={styles.accordion} data-open={isOpen} key={item.id}>
            <button type="button" className={`${styles.trigger} ds-accordion`} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenId(isOpen ? null : item.id)}>
              <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.triggerLabel}>{item.title}</span>
              <span className={styles.plus} aria-hidden="true">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <div id={panelId} className={styles.panel}><BodyText>{item.text}</BodyText></div>}
          </section>;
        })}</div>
      </div>
    </div>
  </section>;
}

export default function Preview({ combination, embedded = false }: { combination: string; embedded?: boolean }) {
  const key = Object.hasOwn(editorial.configurations, combination) ? combination as keyof typeof editorial.configurations : "DI";
  const entry = editorial.configurations[key] as (typeof editorial.configurations)["DI"];
  const primary = entry.primary as Code;
  const secondary = entry.secondary as Code | null;
  const pageIntro = `${relationshipApproaches[primary]}${secondary ? ` ${secondaryInfluences[secondary]}` : ""} Découvre comment ${secondary ? "ces deux tendances influencent" : "cette tendance influence"} tes relations avec les autres profils.`;
  const bannerText = `${relationContributions[primary]} ${relationAdjustments[secondary ?? primary]}`;
  const nextUrl = `/preview/dans-une-organisation-v1?combinaison=${key}`;
  return <main className={`${styles.page} results-design-system`} style={{ "--accent": editorial.profiles[primary].color, "--accent-ink": primary === "I" || primary === "S" ? "#202124" : "#fff" } as CSSProperties}>
    {!embedded && <div className={styles.banner}><strong>PRÉVISUALISATION ÉDITORIALE</strong><span>Textes en validation · aucune restitution individuelle modifiée</span></div>}
    <div className={styles.shell}>
      <section className={styles.pageIntro}>
        <Eyebrow>04 / AVEC LES AUTRES</Eyebrow>
        <h1 className="ds-page-title">Avec les autres</h1>
        <PageIntro>{pageIntro}</PageIntro>
      </section>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <Eyebrow>{entry.intro.eyebrow}</Eyebrow>
          <h1 className="ds-page-title">{entry.intro.title}</h1>
          <PageIntro>{bannerText}</PageIntro>
        </div>
        <div className={styles.heroArt} aria-hidden="true"><div className={styles.orbit}><span /><span /><span /><span /><strong>{entry.intro.orbitLabel}</strong></div></div>
      </header>
      <nav className={styles.anchorNav} aria-label="Aller à un profil">{order.map(code => <a key={code} href={`#${editorial.profiles[code].anchor}`} style={{ "--anchor-accent": editorial.profiles[code].color } as CSSProperties} onClick={event => {
        const target = document.getElementById(editorial.profiles[code].anchor);
        if (!target) return;
        event.preventDefault();
        window.history.replaceState(null, "", `#${editorial.profiles[code].anchor}`);
        target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      }}>{editorial.profiles[code].name}</a>)}</nav>
      {order.map(code => <ProfileSection key={`${key}-${code}`} code={code} portrait={entry.portraits[code]} />)}
      {!embedded && <div className={styles.miniNav}><div><small>Prochaine étape · 05</small><strong>Dans une organisation</strong></div><a href={nextUrl}>Continuer →</a></div>}
    </div>
  </main>;
}
