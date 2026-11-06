"use client";

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import editorial from "@/lib/editorial/profil-mapp-page-05-grandir-v2-textes-personnalises.json";
import {
  BodyText,
  CardTitle,
  Eyebrow,
  PageIntro,
  PageTitle,
  SectionIntro,
  SectionTitle,
} from "@/components/results/typography";
import styles from "./preview.module.css";
import { withMappAssetPath } from "@/lib/routing/base-path";

type Combination = keyof typeof editorial.configurations;
type ProfileCode = keyof typeof editorial.profiles;
type Entry = (typeof editorial.configurations)[Combination];
type Lever = Entry["levers"][number];

const colors: Record<ProfileCode, string> = {
  D: "var(--results-conquerant)",
  I: "var(--results-communiquant)",
  S: "var(--results-facilitateur)",
  C: "var(--results-analyste)",
};

const profileSlugs: Record<ProfileCode, string> = {
  D: "conquerant",
  I: "communiquant",
  S: "facilitateur",
  C: "analyste",
};

const leverDetails: Array<{ key: keyof Pick<Lever, "situation" | "whyItMatters" | "alternative" | "example" | "action">; label: string }> = [
  { key: "situation", label: "Ce qui peut se passer" },
  { key: "whyItMatters", label: "Pourquoi c’est important" },
  { key: "alternative", label: "Ce que tu peux faire autrement" },
  { key: "example", label: "Exemple concret" },
  { key: "action", label: "À expérimenter cette semaine" },
];

const leverPhotos = [
  withMappAssetPath("/images/grandir/leviers/levier-01.jpg"),
  withMappAssetPath("/images/grandir/leviers/levier-02.jpg"),
  withMappAssetPath("/images/grandir/leviers/levier-03.jpg"),
  withMappAssetPath("/images/grandir/leviers/levier-04.jpg"),
  withMappAssetPath("/images/grandir/leviers/levier-05.jpg"),
] as const;

function LeverDropdown({
  label,
  levers,
  selected,
  onSelect,
  optionLabel = (lever) => lever.title,
}: {
  label: string;
  levers: Entry["levers"];
  selected: Lever;
  onSelect: (id: string) => void;
  optionLabel?: (lever: Lever) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.leverSelectBlock}>
      <span className={styles.leverSelectBadge}>{label}</span>
      <div className={styles.leverSelectControl}>
        <button
          type="button"
          className={styles.leverSelectButton}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((value) => !value)}
        >
          <span>{optionLabel(selected)}</span>
          <span className={styles.leverSelectChevron} aria-hidden="true">⌄</span>
        </button>
        {open && (
          <div className={styles.leverSelectMenu} role="listbox" aria-label={label}>
            {levers.map((lever) => (
              <button
                type="button"
                role="option"
                aria-selected={lever.id === selected.id}
                onClick={() => {
                  onSelect(lever.id);
                  setOpen(false);
                }}
                key={lever.id}
              >
                <span>{optionLabel(lever)}</span>
                {lever.id === selected.id && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Preview({ combination, embedded = false, production = false, design = "page03" }: { combination: string; embedded?: boolean; production?: boolean; design?: "page02" | "page03" | "page04" }) {
  const safeCombination = (Object.hasOwn(editorial.configurations, combination) ? combination : "DI") as Combination;
  const entry = editorial.configurations[safeCombination] as Entry;
  const [selectedId, setSelectedId] = useState(entry.levers[0].id);
  const [openCapSection, setOpenCapSection] = useState<"force" | "challenge" | "goal">("force");
  const [openLeverSection, setOpenLeverSection] = useState<"situation" | "alternative" | "action">("situation");
  const [openChallengeStep, setOpenChallengeStep] = useState(0);

  const selectedLever = useMemo(
    () => entry.levers.find((lever) => lever.id === selectedId) ?? entry.levers[0],
    [entry.levers, selectedId],
  );
  const selectedLeverIndex = Math.max(0, entry.levers.findIndex((lever) => lever.id === selectedLever.id));
  const primary = entry.primary as ProfileCode;
  const secondary = entry.secondary as ProfileCode | null;
  const capSections = [
    { id: "force" as const, label: "Ta force", content: entry.nextCap.paragraphs[0] },
    { id: "challenge" as const, label: "Ton défi", content: entry.nextCap.paragraphs[1] },
    { id: "goal" as const, label: "Ton objectif", content: entry.nextCap.goal },
  ];
  const nextUrl = `/preview/resultat?profile=${profileSlugs[primary]}${secondary ? `&secondary=${profileSlugs[secondary]}` : ""}&page=7#results`;

  return (
    <main
      className={`${styles.page} ${design === "page04" ? styles.designPage04 : design === "page02" ? styles.designPage02 : styles.designPage03} results-design-system`}
      style={{ "--accent": colors[primary], "--accent-ink": primary === "I" || primary === "S" ? "#202124" : "#fff" } as CSSProperties}
    >
      {!production && <div className={styles.banner}>
        <strong>PRÉVISUALISATION ÉDITORIALE</strong>
        <span>Textes en validation · aucune restitution individuelle modifiée</span>
        <nav className={styles.designNav} aria-label="Choisir une proposition visuelle">
          <a aria-current={design === "page03" ? "page" : undefined} href={`?combinaison=${safeCombination}&v=page03`}>A · Page 03</a>
          <a aria-current={design === "page04" ? "page" : undefined} href={`?combinaison=${safeCombination}&v=page04`}>B · Page 04</a>
          <a aria-current={design === "page02" ? "page" : undefined} href={`?combinaison=${safeCombination}&v=page02`}>C · Page 02</a>
        </nav>
      </div>}

      <div className={styles.shell}>
        <header className={styles.header}>
          <Eyebrow>05 / Grandir</Eyebrow>
          <PageTitle>{entry.pageIntro.title}</PageTitle>
          <PageIntro>{entry.pageIntro.subtitle}</PageIntro>
        </header>

        <section className={styles.capSection} aria-labelledby="next-cap-title">
          <div className={`${styles.sectionHeading} ${styles.capHeading}`}>
            <Eyebrow>{entry.nextCap.eyebrow}</Eyebrow>
            <SectionTitle id="next-cap-title">{entry.nextCap.title}</SectionTitle>
            <SectionIntro>{entry.nextCap.subtitle}</SectionIntro>
          </div>
          <div className={styles.nextCap}>
            <div className={styles.nextCapPhoto}>
              <Image src={withMappAssetPath("/images/grandir/prochain-cap.jpg")} alt="Équipe souriante derrière un comptoir lors d’un événement MLK" fill sizes="(max-width: 900px) 100vw, 34vw" priority />
            </div>
            <div className={styles.nextCapCopy}>
              <div className={styles.capAccordions}>
                {capSections.map((section, index) => {
                  const open = openCapSection === section.id;
                  return (
                    <div className={styles.capAccordion} key={section.id}>
                      <button
                        type="button"
                        className={styles.capTrigger}
                        aria-expanded={open}
                        onClick={() => setOpenCapSection(section.id)}
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{section.label}</strong>
                        <span className={styles.capPlus} aria-hidden="true">{open ? "−" : "+"}</span>
                      </button>
                      {open && <div className={styles.capPanel}><BodyText>{section.content}</BodyText></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.levers} aria-labelledby="levers-title">
          <div className={`${styles.sectionHeading} ${styles.leverHeading}`}>
            <Eyebrow>{entry.leversSection.eyebrow}</Eyebrow>
            <SectionTitle id="levers-title">{entry.leversSection.title}</SectionTitle>
            <SectionIntro>{entry.leversSection.subtitle}</SectionIntro>
          </div>
          {design === "page02" ? (
            <div className={`${styles.nextCap} ${styles.adviceBlock}`}>
              <div className={styles.nextCapPhoto}>
                <Image src={leverPhotos[0]} alt="Conseils pour faire évoluer ses habitudes" fill sizes="(max-width: 700px) 100vw, 34vw" />
                <span className={styles.photoLabel}>Nos conseils</span>
              </div>
              <div className={styles.nextCapCopy}>
                <LeverDropdown
                  label={`Conseil ${selectedLeverIndex + 1} sur 5`}
                  levers={entry.levers}
                  selected={selectedLever}
                  onSelect={setSelectedId}
                />
                <div className={styles.capAccordions}>
                  {([
                    { id: "situation" as const, label: "Ce qui peut se passer", content: <><BodyText>{selectedLever.situation}</BodyText><BodyText><strong>Pourquoi c’est important.</strong> {selectedLever.whyItMatters}</BodyText></> },
                    { id: "alternative" as const, label: "Ce que tu peux faire autrement", content: <><BodyText>{selectedLever.alternative}</BodyText><BodyText><strong>Exemple concret.</strong> {selectedLever.example}</BodyText></> },
                    { id: "action" as const, label: "À expérimenter cette semaine", content: <BodyText>{selectedLever.action}</BodyText> },
                  ]).map((section, index) => {
                    const open = openLeverSection === section.id;
                    return <div className={styles.capAccordion} key={section.id}>
                      <button type="button" className={styles.capTrigger} aria-expanded={open} onClick={() => setOpenLeverSection(section.id)}>
                        <span>{String(index + 1).padStart(2, "0")}</span><strong>{section.label}</strong><span className={styles.capPlus} aria-hidden="true">{open ? "−" : "+"}</span>
                      </button>
                      {open && <div className={styles.capPanel}>{section.content}</div>}
                    </div>;
                  })}
                </div>
              </div>
            </div>
          ) : <><div className={styles.leverPicker} role="tablist" aria-label="Choisir un levier de progression">
            {entry.levers.map((lever, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={lever.id === selectedLever.id}
                className={styles.leverChoice}
                onClick={() => setSelectedId(lever.id)}
                key={lever.id}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{lever.title}</strong>
              </button>
            ))}
          </div>
          <div className={styles.leverFocus} aria-live="polite">
            <figure className={styles.leverFocusPhoto}>
              <Image src={leverPhotos[selectedLeverIndex]} alt={`Illustration du levier « ${selectedLever.title} »`} fill sizes="(max-width: 700px) 100vw, 25vw" />
            </figure>
            <div className={styles.leverFocusCopy}>
              <Eyebrow>Ton levier</Eyebrow>
              <CardTitle as="h3">{selectedLever.title}</CardTitle>
              <div className={styles.leverInsight}>
                <h4>{leverDetails[0].label}</h4>
                <p className={styles.leverSituation}>{selectedLever.situation}</p>
                <p className={styles.leverWhy}><strong>{leverDetails[1].label}.</strong> {selectedLever.whyItMatters}</p>
              </div>
              <div className={styles.leverInsight}>
                <h4>{leverDetails[2].label}</h4>
                <p>{selectedLever.alternative}</p>
                <p className={styles.leverExample}><strong>{leverDetails[3].label}.</strong> {selectedLever.example}</p>
              </div>
              <div className={styles.leverAction}>
                <span>{leverDetails[4].label}</span>
                <strong>{selectedLever.action}</strong>
              </div>
            </div>
          </div></>}
        </section>

        <section className={styles.challengeSection} aria-labelledby="challenge-title">
          <div className={`${styles.sectionHeading} ${styles.challengeHeading}`}>
            <Eyebrow>{entry.sevenDayChallenge.eyebrow}</Eyebrow>
            <SectionTitle id="challenge-title">{entry.sevenDayChallenge.title}</SectionTitle>
            <SectionIntro>{entry.sevenDayChallenge.subtitle}</SectionIntro>
          </div>
          {design === "page02" ? (
            <div className={`${styles.nextCap} ${styles.challengeAdviceBlock}`}>
              <div className={styles.nextCapPhoto}>
                <Image src={withMappAssetPath("/images/grandir/defi-7-jours.jpg")} alt="Homme souriant levant le bras lors d’un événement MLK" fill sizes="(max-width: 700px) 100vw, 34vw" />
                <span className={styles.photoLabel}>Tes défis</span>
              </div>
              <div className={styles.nextCapCopy}>
                <LeverDropdown
                  label={`Défi de la semaine ${selectedLeverIndex + 1} sur 5`}
                  levers={entry.levers}
                  selected={selectedLever}
                  onSelect={setSelectedId}
                  optionLabel={(lever) => lever.action}
                />
                <div className={styles.capAccordions}>
                  {entry.sevenDayChallenge.steps.map((step, index) => {
                    const open = openChallengeStep === index;
                    return <div className={styles.capAccordion} key={step.day}>
                      <button type="button" className={styles.capTrigger} aria-expanded={open} onClick={() => setOpenChallengeStep(index)}>
                        <span>{String(index + 1).padStart(2, "0")}</span><strong>{step.day} · {step.title}</strong><span className={styles.capPlus} aria-hidden="true">{open ? "−" : "+"}</span>
                      </button>
                      {open && <div className={styles.capPanel}><BodyText>{step.description}</BodyText></div>}
                    </div>;
                  })}
                </div>
              </div>
            </div>
          ) : <div className={styles.challenge}>
            <div className={styles.challengePhoto}>
              <Image src={withMappAssetPath("/images/grandir/defi-7-jours.jpg")} alt="Homme souriant levant le bras lors d’un événement MLK" fill sizes="(max-width: 800px) 100vw, 42vw" />
            </div>
            <div className={styles.challengeCopy}>
              <Eyebrow>Cette semaine, expérimente</Eyebrow>
              <CardTitle>{selectedLever.action}</CardTitle>
              <div className={styles.challengeLevers} role="tablist" aria-label="Choisir le levier du défi">
                {entry.levers.map((lever, index) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={lever.id === selectedLever.id}
                    onClick={() => setSelectedId(lever.id)}
                    key={lever.id}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {lever.title}
                  </button>
                ))}
              </div>
            <div className={styles.challengeSteps}>
              {entry.sevenDayChallenge.steps.map((step, index) => (
                <div className={styles.challengeStep} key={step.day}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <Eyebrow>{step.day}</Eyebrow>
                    <strong>{step.title}</strong>
                    <BodyText>{step.description}</BodyText>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>}
        </section>

        <section className={styles.reflection} aria-labelledby="reflection-title">
          <div className={`${styles.sectionHeading} ${styles.reflectionHeading}`}>
            <Eyebrow>{entry.reflection.eyebrow}</Eyebrow>
            <SectionTitle id="reflection-title">{entry.reflection.title}</SectionTitle>
            <SectionIntro>{entry.reflection.subtitle}</SectionIntro>
          </div>
          <ol className={styles.questions}>
            {entry.reflection.questions.map((question, index) => (
              <li className={styles.question} key={question}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <p>{question}</p>
              </li>
            ))}
          </ol>
        </section>

        {!embedded && <div className={styles.miniNav}>
          <div><small>Prochaine étape · 07</small><strong>Dans la Bible</strong></div>
          <a href={nextUrl}>Continuer →</a>
        </div>}
      </div>
    </main>
  );
}
