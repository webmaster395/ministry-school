"use client";

import { useState } from "react";
import editorial from "@/lib/editorial/profil-mapp-page-03-forces-defis-v5-principal-secondaire.json";
import { BodyText, CardTitle, Eyebrow, PageIntro, PageTitle, SectionIntro, SectionTitle } from "@/components/results/typography";
import { withMappAssetPath } from "@/lib/routing/base-path";
import styles from "./preview.module.css";

type ProfileCode = keyof typeof editorial.profiles;
type EditorialEntry = (typeof editorial.profiles)[ProfileCode];
const colors: Record<ProfileCode, string> = {
  D: "var(--results-conquerant)", I: "var(--results-communiquant)",
  S: "var(--results-facilitateur)", C: "var(--results-analyste)",
};
const photos: Record<string, { src: string; alt: string; position: string }> = {
  talents: { src: withMappAssetPath("/images/forces-defis/talents-nouveau.webp"), alt: "Jeune femme souriante en t-shirt blanc", position: "center 32%" },
  besoins: { src: withMappAssetPath("/images/forces-defis/besoins.webp"), alt: "Jeune femme souriante tenant un livre", position: "center 34%" },
  peurs: { src: withMappAssetPath("/images/forces-defis/peurs.webp"), alt: "Personne en retrait dans un espace sombre", position: "54% center" },
  emotions: { src: withMappAssetPath("/images/forces-defis/emotions.webp"), alt: "Deux personnes s'étreignent", position: "center 42%" },
  strengths: { src: withMappAssetPath("/images/forces-defis/forces.webp"), alt: "Femme souriante tenant une tablette", position: "center 30%" },
  challenges: { src: withMappAssetPath("/images/forces-defis/defis-elan.jpg"), alt: "Jeune homme levant le poing dans une lumière de scène", position: "56% center" },
};
const cardEyebrows: Record<string, string> = {
  talents: "01 / Aptitudes", besoins: "02 / Conditions",
  peurs: "03 / Sensibilités", emotions: "04 / Ressenti",
};
const profileSlugs: Record<ProfileCode, string> = {
  D: "conquerant", I: "communiquant", S: "facilitateur", C: "analyste",
};

function AccordionSection({ kind, items }: { kind: "strengths" | "challenges"; items: EditorialEntry["strengths"] | EditorialEntry["challenges"] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const isStrength = kind === "strengths";
  const headingId = `${kind}-heading`;
  const photo = photos[kind];
  return <section className={styles.chapter} aria-labelledby={headingId}>
    <div className={styles.chapterHeading}>
      <Eyebrow>{isStrength ? "02 / Tes forces" : "03 / Tes défis"}</Eyebrow>
      <SectionTitle id={headingId}>{isStrength ? "Tes forces." : "Tes défis."}</SectionTitle>
      <SectionIntro>{isStrength ? "Ce sur quoi tu peux t’appuyer." : "Ce qui mérite ton attention."}</SectionIntro>
    </div>
    <div className={styles.chapterLayout}>
      <img className={`${styles.portrait} ${!isStrength ? styles.challengePortrait : ""}`} src={photo.src} alt={photo.alt} style={{ objectPosition: photo.position }} loading="eager" decoding="async" />
      <div className={styles.accordions}>{items.map(item => {
        const isOpen = openId === item.id;
        const panelId = `${kind}-${item.id}`;
        const detail = "example" in item ? { label: item.exampleLabel, text: item.example } : { label: item.actionLabel, text: item.action };
        return <section className={styles.accordion} data-open={isOpen} key={item.id}>
          <button type="button" className={`${styles.trigger} ds-accordion`} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenId(isOpen ? null : item.id)}>
            <span>{item.title}</span><span className={styles.plus} aria-hidden="true">{isOpen ? "−" : "+"}</span>
          </button>
          {isOpen && <div id={panelId} className={styles.panel}>
            <BodyText>{item.description}</BodyText>
            <div className={styles.detail}><Eyebrow>{detail.label}</Eyebrow><BodyText>{detail.text}</BodyText></div>
          </div>}
        </section>;
      })}</div>
    </div>
  </section>;
}

export default function Preview({ combination, embedded = false, production = false }: { combination: string; embedded?: boolean; production?: boolean }) {
  const entry = (Object.hasOwn(editorial.orderedCombinations, combination)
    ? editorial.orderedCombinations[combination as keyof typeof editorial.orderedCombinations]
    : editorial.profiles[combination as ProfileCode]) as EditorialEntry;
  const accent = colors[entry.primary as ProfileCode];
  const nextUrl = `/preview/resultat?profile=${profileSlugs[entry.primary as ProfileCode]}${entry.secondary ? `&secondary=${profileSlugs[entry.secondary as ProfileCode]}` : ""}&page=4#results`;
  return <main className={`${styles.page} results-design-system`} style={{ "--accent": accent, "--accent-ink": entry.primary === "I" || entry.primary === "S" ? "#202124" : "#fff", "--hover-ink": entry.primary === "I" || entry.primary === "S" ? "#202124" : "#fff" } as React.CSSProperties}>
    {!production && <div className={styles.banner}><strong>PRÉVISUALISATION ÉDITORIALE</strong><span>Textes en validation · aucune restitution individuelle modifiée</span></div>}
    <div className={styles.shell}>
      <header className={styles.header}>
        <Eyebrow>03 / Forces et défis</Eyebrow>
        <PageTitle>{editorial.page.title}</PageTitle>
        <PageIntro>{editorial.page.introText}</PageIntro>
      </header>
      <section className={styles.characteristics} aria-labelledby="characteristics-heading">
        <div className={styles.sectionHeading}><Eyebrow>01 / Ton profil</Eyebrow><SectionTitle id="characteristics-heading">Ce qui te caractérise.</SectionTitle><SectionIntro>{entry.intro}</SectionIntro></div>
        <div className={styles.cardGrid}>{entry.characteristics.map(card => {
          const photo = photos[card.id];
          return <article className={styles.card} key={card.id}>
            <div className={styles.cardCopy}><Eyebrow>{cardEyebrows[card.id]}</Eyebrow><CardTitle>{card.title}</CardTitle><BodyText>{card.text}</BodyText></div>
            <img src={photo.src} alt={photo.alt} className={styles.cardPhoto} style={{ objectPosition: photo.position }} loading="eager" decoding="async" />
          </article>;
        })}</div>
      </section>
      <AccordionSection kind="strengths" items={entry.strengths} />
      <AccordionSection kind="challenges" items={entry.challenges} />
      {!embedded && <div className={styles.miniNav}><div><small>Prochaine étape · 04</small><strong>Avec les autres</strong></div><a href={nextUrl}>Continuer →</a></div>}
    </div>
  </main>;
}
