"use client";

import { useState } from "react";
import { functioningMedia } from "@/lib/editorial/functioning-presentation-v1";
import pressureEditorial from "@/lib/editorial/profil-mapp-sous-pression-12-combinaisons-v1.json";
import quotidien from "@/lib/editorial/profil-mapp-quotidien-12-combinaisons-v1.json";
import { getCommunicationPreview } from "@/lib/editorial/functioning-communication-preview-v1";
import reviewedInteractions from "@/lib/editorial/profil-mapp-comment-communiquer-avec-toi-v4.json";
import { interactionsIntrosPreviewV2 } from "@/lib/editorial/functioning-interactions-intros-preview-v2";
import { naturalFunctioningIntros } from "@/lib/editorial/functioning-natural-intros-preview-v1";
import { pressureFunctioningIntros, pressureSectionIntros } from "@/lib/editorial/functioning-pressure-intros-preview-v1";
import { pressureResultReadings } from "@/lib/editorial/functioning-pressure-results-v1";
import { BodyText, CardTitle, Eyebrow, PageIntro, PageTitle, SectionIntro, SectionTitle } from "@/components/results/typography";
import { withMappAssetPath } from "@/lib/routing/base-path";
import styles from "./preview.module.css";

export type DailyCombination = keyof typeof quotidien.combinations;
const dailyImages = {
  motivation: { src: withMappAssetPath("/images/functioning/daily-motivation-mlk.webp"), alt: "Homme souriant en pull orange tenant son téléphone", position: "center 32%" },
  decisions: { src: withMappAssetPath("/images/functioning/daily-decisions-mlk-v2.webp"), alt: "Homme aux cheveux gris échangeant avec un groupe lors d’un événement MLK", position: "center 25%" },
  action: { src: withMappAssetPath("/images/functioning/daily-action-mlk.webp"), alt: "Femme blonde souriante tenant une tasse", position: "center 17%" },
  relations: { src: withMappAssetPath("/images/functioning/daily-relations-mlk.webp"), alt: "Trois femmes échangeant et souriant ensemble", position: "center 25%" },
} as const;
const dailyColors = { D: "var(--results-conquerant)", I: "var(--results-communiquant)", S: "var(--results-facilitateur)", C: "var(--results-analyste)" } as const;
type ProfileCode = keyof typeof dailyColors;
type PressureCombination = keyof typeof pressureEditorial.orderedCombinations;
type PressureSection = "reactions" | "communication" | "balance";
export type StoredPressureResult = { primary: ProfileCode; secondary: ProfileCode | null; percentages: Record<ProfileCode, number> };
const profileNames: Record<ProfileCode, string> = { D: "Conquérant", I: "Communiquant", S: "Facilitateur", C: "Analyste" };
const pressurePhotos = {
  reactions: { src: withMappAssetPath("/images/functioning/pressure-reactions-mlk.webp"), alt: "Homme en noir et blanc, tête baissée et mains ouvertes", position: "center 42%" },
  communication: { src: withMappAssetPath("/images/functioning/pressure-communication-mlk.webp"), alt: "Personne agenouillée soutenue par une autre personne lors d'un rassemblement MLK", position: "center 50%" },
  balance: { src: withMappAssetPath("/images/functioning/pressure-balance-mlk.webp"), alt: "Main levée en noir et blanc dans une assemblée", position: "center 55%" },
} as const;

function PressureChapter({ combination, kind }: { combination: PressureCombination; kind: PressureSection }) {
  const content = pressureEditorial.orderedCombinations[combination].sections[kind];
  const definition = pressureEditorial.sections.find(section => section.id === kind)!;
  const photo = pressurePhotos[kind];
  const [openId, setOpenId] = useState<string | null>(content[0].id);
  const headingId = `pressure-${kind}-heading`;
  const sectionIndex = { reactions: 0, communication: 1, balance: 2 } as const;
  return <section className={styles.communicationChapter} aria-labelledby={headingId}>
    <div className={styles.communicationHeading}><Eyebrow className={styles.kicker}>{kind === "reactions" ? "01 / Tes réactions" : kind === "communication" ? "02 / Ta communication" : "03 / Ton équilibre"}</Eyebrow><SectionTitle as="h3" id={headingId}>{definition.title}</SectionTitle><SectionIntro>{pressureSectionIntros[combination][sectionIndex[kind]]}</SectionIntro></div>
    <div className={styles.communicationLayout}>
      <img className={styles.communicationPortrait} src={photo.src} alt={photo.alt} style={{ objectPosition: photo.position }} loading="eager" decoding="async" />
      <div className={styles.accordions}>{content.map(item => {
        const isOpen = openId === item.id;
        const panelId = `pressure-${kind}-${item.id}`;
        return <section className={styles.accordion} data-open={isOpen} key={item.id}>
          <button type="button" className={`${styles.accordionTrigger} ds-accordion`} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenId(isOpen ? null : item.id)}><span>{item.title}</span><span className={styles.plus} aria-hidden="true">{isOpen ? "−" : "+"}</span></button>
          {isOpen && <div className={styles.communicationPanel} id={panelId}><BodyText>{item.text}</BodyText></div>}
        </section>;
      })}</div>
    </div>
  </section>;
}

function CommunicationChapter({ combination, kind, context = "natural" }: { combination: DailyCombination; kind: "communication" | "interactions"; context?: "natural" | "underPressure" }) {
  const content = context === "underPressure"
    ? { ...reviewedInteractions.orderedCombinations[combination].underPressure, title: "Comment communiquer avec toi sous pression.", intro: interactionsIntrosPreviewV2[combination].underPressure }
    : getCommunicationPreview(combination)[kind];
  const [openId, setOpenId] = useState<string | null>(content.accordions[0].id);
  const isCommunication = kind === "communication";
  const headingId = context === "underPressure" ? "pressure-interactions-heading" : isCommunication ? "communication-heading" : "interactions-heading";
  const image = isCommunication
    ? functioningMedia.communication
    : context === "underPressure"
      ? { src: withMappAssetPath("/images/functioning/pressure-interactions-mlk.webp"), alt: "Deux personnes souriantes échangent et se serrent la main lors d'un rassemblement MLK", objectPosition: "center 38%" }
      : { src: withMappAssetPath("/images/functioning/advice-new-mlk.webp"), alt: "Femme souriante avec des lunettes et un pull bleu à rayures lors d'un événement MLK", objectPosition: "center 36%" };
  return <section className={styles.communicationChapter} aria-labelledby={headingId}>
    <div className={styles.communicationHeading}><Eyebrow className={styles.kicker}>{context === "underPressure" ? "04 / Avec toi" : isCommunication ? "02 / Ta communication" : "03 / Avec toi"}</Eyebrow><SectionTitle as="h3" id={headingId}>{content.title}</SectionTitle><SectionIntro>{content.intro}</SectionIntro></div>
    <div className={styles.communicationLayout}>
      <img className={styles.communicationPortrait} src={image.src} alt={image.alt} style={{ objectPosition: image.objectPosition }} loading="lazy" decoding="async" />
      <div className={styles.accordions}>{content.accordions.map(item => {
        const isOpen = openId === item.id;
        const panelId = `${context}-${kind}-${item.id}`;
        return <section className={styles.accordion} data-open={isOpen} key={item.id}>
          <button type="button" className={`${styles.accordionTrigger} ds-accordion`} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenId(isOpen ? null : item.id)}><span>{item.title}</span><span className={styles.plus} aria-hidden="true">{isOpen ? "−" : "+"}</span></button>
          {isOpen && <div className={styles.communicationPanel} id={panelId}><BodyText>{item.text}</BodyText></div>}
        </section>;
      })}</div>
    </div>
  </section>;
}

export default function Demo({ combination = "DI", pressureCombination = "DI", pressureResult, pressureTieNote, initialTab = "natural", production = false, onSwitch }: { combination?: DailyCombination; pressureCombination?: PressureCombination; pressureResult?: StoredPressureResult; pressureTieNote?: string | null; initialTab?: "natural" | "stress"; production?: boolean; onSwitch?: (tab: "natural" | "stress") => void }) {
  const [tab, setTab] = useState<"natural" | "stress">(initialTab);
  const switchTab = (next: "natural" | "stress") => { setTab(next); onSwitch?.(next); };
  const cards = quotidien.combinations[combination].cards;
  const dailyAccent = dailyColors[combination[0] as keyof typeof dailyColors];
  const pressurePrimary = (pressureResult?.primary ?? pressureCombination[0]) as ProfileCode;
  const resolvedPressurePair = pressureResult
    ? pressureResult.secondary && Object.hasOwn(pressureEditorial.orderedCombinations, `${pressureResult.primary}${pressureResult.secondary}`)
      ? `${pressureResult.primary}${pressureResult.secondary}` as PressureCombination : null
    : production ? null : pressureCombination;
  const rankedPressureCodes = pressureResult
    ? (Object.keys(profileNames) as ProfileCode[]).sort((left, right) =>
      pressureResult.percentages[right] - pressureResult.percentages[left]
      || Number(right === pressureResult.primary) - Number(left === pressureResult.primary)
      || Number(right === pressureResult.secondary) - Number(left === pressureResult.secondary),
    )
    : [];
  const accentProfile = tab === "natural" ? combination[0] : pressurePrimary;
  return <main className={`${styles.page} results-design-system`} style={{ "--accent": tab === "natural" ? dailyAccent : production && !pressureResult ? "var(--results-text)" : dailyColors[pressurePrimary], "--accent-ink": accentProfile === "I" || accentProfile === "S" ? "var(--results-text)" : "#fff", "--secondary": dailyColors.I, "--tab-selected-text": accentProfile === "I" || accentProfile === "S" ? "var(--results-text)" : "#fff" } as React.CSSProperties}>
    {!production && <div className={styles.demoBanner}><strong>PRÉVISUALISATION ÉDITORIALE</strong><span>Données fictives · aucun résultat individuel · cette page ne remplace pas la restitution des participants.</span></div>}
    <div className={styles.shell}>
      <header className={styles.header}><Eyebrow className={styles.kicker}>02 / Ton fonctionnement</Eyebrow><PageTitle>Comment tu fonctionnes.</PageTitle><PageIntro>Une lecture de tes tendances au quotidien et dans les moments de pression.</PageIntro>
        <div role="tablist" aria-label="Lecture du fonctionnement" className={styles.tabs}>
          <button type="button" role="tab" aria-selected={tab === "natural"} onClick={() => switchTab("natural")}>Au naturel</button>
          <button type="button" role="tab" aria-selected={tab === "stress"} onClick={() => switchTab("stress")}>Sous pression</button>
        </div>
      </header>
      {tab === "natural" ? <div role="tabpanel" className={styles.content}>
        <div className={styles.lead}><SectionTitle>Ta manière naturelle de fonctionner.</SectionTitle><PageIntro>{naturalFunctioningIntros[combination]}</PageIntro></div>
        <section className={styles.daily} style={{ "--daily-accent": dailyAccent, "--daily-ink": combination[0] === "I" || combination[0] === "S" ? "#202527" : "#fff", "--daily-hover-text": combination[0] === "I" || combination[0] === "S" ? "#202527" : "#fff" } as React.CSSProperties}>
          <div className={styles.dailyLead}><Eyebrow className={styles.kicker}>01 / Ton quotidien</Eyebrow><SectionTitle as="h3">Dans ton quotidien.</SectionTitle></div>
          <div className={styles.dailyGrid}>{cards.map(card => {
            const image = dailyImages[card.id as keyof typeof dailyImages];
            return <article className={styles.dailyCard} key={card.id}>
              <div className={styles.dailyCardCopy}><Eyebrow className={styles.dailyEyebrow}>{card.eyebrow}</Eyebrow><CardTitle as="h4">{card.title}</CardTitle><BodyText>{card.text}</BodyText></div>
              <img className={styles.dailyImage} src={image.src} alt={image.alt} style={{ objectPosition: image.position }} loading="lazy" decoding="async" />
            </article>;
          })}</div>
        </section>
        <CommunicationChapter combination={combination} kind="communication" />
        <CommunicationChapter combination={combination} kind="interactions" />
        <button type="button" className={styles.nextLink} onClick={() => switchTab("stress")}>Découvrir comment tu réagis sous pression <span aria-hidden="true">↗</span></button>
      </div> : <div role="tabpanel" className={styles.content} data-context="stress">
        <div className={styles.lead}><SectionTitle>Comment tu réagis sous pression.</SectionTitle><PageIntro>{resolvedPressurePair ? pressureFunctioningIntros[resolvedPressurePair] : "Le profil secondaire sous pression n'est pas encore déterminé. Cette lecture personnalisée sera disponible une fois le classement enregistré."}</PageIntro></div>
        <section className={styles.pressureResults} data-reading={Boolean(resolvedPressurePair)} aria-label="Résultats sous pression">
          {resolvedPressurePair && <div className={styles.pressureReading}><Eyebrow className={styles.kicker}>Tes tendances sous pression</Eyebrow><CardTitle>{pressureResultReadings[resolvedPressurePair].title}</CardTitle><BodyText>{pressureResultReadings[resolvedPressurePair].text}</BodyText></div>}
          {pressureResult ? <div className={styles.stressBars}>{rankedPressureCodes.map(code => <div key={code} className={styles.stressRow} data-primary={code === pressureResult.primary}>
            <span>{profileNames[code]}</span>
            <i aria-hidden="true" style={{ "--bar": dailyColors[code], "--pct": `${Math.max(0, Math.min(100, pressureResult.percentages[code]))}%` } as React.CSSProperties} />
            <strong>{pressureResult.percentages[code].toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %</strong>
          </div>)}</div> : <p className={styles.noScores}>Scores sous pression indisponibles.</p>}
          {pressureResult && pressureTieNote && <p className={styles.pressureTieNote}>{pressureTieNote}</p>}
        </section>
        {resolvedPressurePair && <>
          <PressureChapter combination={resolvedPressurePair} kind="reactions" />
          <PressureChapter combination={resolvedPressurePair} kind="communication" />
          <PressureChapter combination={resolvedPressurePair} kind="balance" />
          <CommunicationChapter combination={resolvedPressurePair} kind="interactions" context="underPressure" />
        </>}
        <button type="button" className={styles.nextLink} onClick={() => switchTab("natural")}>Revenir à ton fonctionnement naturel <span aria-hidden="true">↗</span></button>
      </div>}
    </div>
  </main>;
}
