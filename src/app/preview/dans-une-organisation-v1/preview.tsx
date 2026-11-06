"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BodyText, CardTitle, Eyebrow, PageIntro, PageTitle, SectionIntro, SectionTitle } from "@/components/results/typography";
import rolePresentationData from "@/data/editorial/profil-mapp-organisation-role-presentations-v9.json";
import styles from "./preview.module.css";
import { defaultContextForRole, ROLE_CONTEXT_IDS } from "./dataset";
import { manualPresentations } from "./manual-presentation";
import { PeopleReminder } from "./people-reminder";
import type { ContextId, OrganisationConfiguration, OrganisationManifest, ProfileCode, RoleId } from "./types";
import { withMappAssetPath } from "@/lib/routing/base-path";

const roleOrder: RoleId[] = ["direction", "management", "contribution", "transversal"];
const profileOrder: ProfileCode[] = ["D", "I", "S", "C"];
const profileNames: Record<ProfileCode, string> = { D: "Paul", I: "Pierre", S: "Abraham", C: "Moïse" };
const roleTitles: Record<RoleId, string> = {
  direction: "Quand tu diriges",
  management: "Quand tu encadres",
  contribution: "Quand tu contribues",
  transversal: "Quand tu collabores",
};
const roleImages: Record<RoleId, { src: string; alt: string; position: string }> = {
  direction: { src: withMappAssetPath("/images/organisation/role-direction.jpg"), alt: "Deux responsables réunis lors d’un événement MLK", position: "center 48%" },
  management: { src: withMappAssetPath("/images/organisation/role-management.jpg"), alt: "Une responsable échange avec son équipe lors d’un événement MLK", position: "36% 42%" },
  contribution: { src: withMappAssetPath("/images/organisation/role-contribution.jpg"), alt: "Une équipière souriante engagée dans une mission MLK", position: "center 30%" },
  transversal: { src: withMappAssetPath("/images/organisation/role-collaboration.jpg"), alt: "Deux collaboratrices échangent dans les locaux MLK", position: "center 32%" },
};
type RolePresentation = { role: string; strengths: [string, string]; vigilance: string };
const rolePresentations = rolePresentationData.presentations as unknown as Record<string, Record<RoleId, RolePresentation>>;
function counterpartSubtitle(role: RoleId, context: ContextId, profile: string) {
  if (role === "direction") return `Quand j’échange avec un ${profile} en donnant le cap`;
  if (role === "management") return `Quand j’échange avec un ${profile} dans mon rôle d’encadrement`;
  if (role === "contribution" && context === "avec_responsable") return `Quand je travaille avec mon responsable au profil ${profile}`;
  if (role === "contribution" && context === "avec_collegue") return `Quand je travaille avec un collègue au profil ${profile}`;
  return `Quand je collabore avec un ${profile}`;
}
const resultSections = [
  ["yourLikelyReflex", "01", "Ton réflexe probable"],
  ["potentialFriction", "02", "Ce qui peut coincer"],
  ["recommendedApproach", "03", "Comment t’y prendre"],
  ["wordsToUse", "04", "Les mots à utiliser"],
  ["avoid", "05", "Ce qu’il faut éviter"],
  ["practicalAction", "06", "À expérimenter"],
] as const;

function quoteWords(words: string) {
  const value = words.trim();
  return value.startsWith("«") && value.endsWith("»") ? value : `« ${value} »`;
}

const profileTerms: Record<ProfileCode, string[]> = {
  D: ["Conquérante", "Conquérant"],
  I: ["Communicante", "Communiquant"],
  S: ["Facilitatrice", "Facilitateur"],
  C: ["Analyste"],
};

function ProfileText({ text, counterpart }: { text: string; counterpart: ProfileCode }) {
  const expression = new RegExp(`(${profileTerms[counterpart].join("|")})`, "g");
  return <>{text.split(expression).map((part, index) => profileTerms[counterpart].includes(part)
    ? <mark className={styles.profileMention} key={index}>{part}</mark>
    : part)}</>;
}

function HighlightedParagraphs({ text, emphasis, counterpart }: { text: string; emphasis?: string; counterpart: ProfileCode }) {
  return <div className={styles.editorialParagraphs}>{text.split("\n\n").map((paragraph, index) => {
    if (!emphasis || !paragraph.includes(emphasis)) return <p key={index}><ProfileText text={paragraph} counterpart={counterpart} /></p>;
    const [before, after] = paragraph.split(emphasis);
    return <p key={index}><ProfileText text={before} counterpart={counterpart} /><strong><ProfileText text={emphasis} counterpart={counterpart} /></strong><ProfileText text={after} counterpart={counterpart} /></p>;
  })}</div>;
}

function ExperimentPresentation({ text, hook, prompts, conclusion, counterpart }: { text: string; hook: string; prompts: string[]; conclusion: string; counterpart: ProfileCode }) {
  const paragraphs = text.split("\n\n");
  return <div className={styles.experimentPresentation}>{paragraphs.map((paragraph, index) => {
    if (paragraph === hook) return <p className={styles.experimentHook} key={index}><strong><ProfileText text={paragraph} counterpart={counterpart} /></strong></p>;
    if (prompts.includes(paragraph)) return <blockquote key={index}>{paragraph}</blockquote>;
    if (paragraph === conclusion) return <p className={styles.experimentConclusion} key={index}><strong>{paragraph}</strong></p>;
    return <p key={index}><ProfileText text={paragraph} counterpart={counterpart} /></p>;
  })}</div>;
}

function RoleDiagram({ role }: { role: RoleId }) {
  const person = (cx: number, cy: number, active = false) => <g>
    <circle cx={cx} cy={cy} r="12" className={active ? styles.diagramParticipant : styles.diagramPerson} />
    <path d={`M ${cx - 17} ${cy + 27}c0-10 7-16 17-16s17 6 17 16`} className={active ? styles.diagramParticipantBody : styles.diagramPersonBody} />
    {active && <text x={cx} y={cy + 4} textAnchor="middle">Toi</text>}
  </g>;
  const link = (x1: number, y1: number, x2: number, y2: number, both = false) => <line x1={x1} y1={y1} x2={x2} y2={y2} className={styles.diagramLink} markerEnd="url(#role-arrow)" markerStart={both ? "url(#role-arrow-back)" : undefined} />;

  return <svg className={styles.roleDiagram} viewBox="0 0 280 150" role="img" aria-label={`Schéma de la relation professionnelle : ${roleTitles[role]}`}>
    <defs>
      <marker id="role-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
      <marker id="role-arrow-back" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 10 0 L 0 5 L 10 10 z" /></marker>
    </defs>
    {role === "direction" && <>
      {link(140, 52, 68, 98, true)}{link(140, 52, 140, 98, true)}{link(140, 52, 212, 98, true)}
      {person(140, 28, true)}{person(68, 112)}{person(140, 112)}{person(212, 112)}
    </>}
    {role === "management" && <>
      {link(140, 47, 140, 73, true)}{link(140, 102, 72, 122, true)}{link(140, 102, 140, 122, true)}{link(140, 102, 208, 122, true)}
      {person(140, 24)}{person(140, 79, true)}{person(72, 126)}{person(140, 126)}{person(208, 126)}
    </>}
    {role === "contribution" && <>
      {link(140, 48, 140, 94, true)}{link(122, 112, 77, 112, true)}{link(158, 112, 203, 112, true)}
      {person(140, 25)}{person(140, 105, true)}{person(55, 105)}{person(225, 105)}
    </>}
    {role === "transversal" && <>
      <circle cx="140" cy="76" r="25" className={styles.diagramGoal} /><text x="140" y="80" textAnchor="middle" className={styles.diagramGoalText}>Projet</text>
      {link(62, 76, 111, 76, true)}{link(169, 76, 218, 76, true)}{link(140, 45, 140, 30, true)}{link(140, 107, 140, 122, true)}
      {person(38, 69, true)}{person(242, 69)}{person(140, 13)}{person(140, 129)}
    </>}
  </svg>;
}

export default function OrganisationPreview({ combination, configuration, manifest, initialRole, initialContext, embedded = false, onNavigate }: {
  combination: string;
  configuration: OrganisationConfiguration;
  manifest: OrganisationManifest;
  initialRole: RoleId;
  initialContext: ContextId;
  embedded?: boolean;
  onNavigate?: (page: number) => void;
}) {
  const [role, setRole] = useState<RoleId>(initialRole);
  const [context, setContext] = useState<ContextId>(initialContext);
  const [openCategory, setOpenCategory] = useState(manifest.categories[0].id);
  const [selectedSituations, setSelectedSituations] = useState<Record<string, string>>(() =>
    Object.fromEntries(manifest.categories.map(category => [category.id, category.situations[0].id])),
  );
  const [counterpart, setCounterpart] = useState<ProfileCode>("D");
  const [openResultFields, setOpenResultFields] = useState<string[]>(["yourLikelyReflex"]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const roleTabsRef = useRef<HTMLElement | null>(null);
  const roleContent = configuration.roles[role];
  const contextContent = roleContent.contexts[context];
  if (!contextContent) throw new Error(`Contexte ${context} indisponible pour le rôle ${role}`);
  const rolePresentation = rolePresentations[combination]?.[role];
  if (!rolePresentation) throw new Error(`Présentation de rôle indisponible pour ${combination}/${role}`);
  const roleImage = roleImages[role];
  const accent = manifest.design.profileColors[configuration.primary];
  const activeCategoryDefinition = manifest.categories.find(category => category.id === openCategory) ?? manifest.categories[0];
  const activeSituation = selectedSituations[activeCategoryDefinition.id];
  const selectedCase = useMemo(() => {
    const situationId = selectedSituations[openCategory];
    return contextContent.counterparts[counterpart].cases[situationId];
  }, [contextContent, counterpart, openCategory, selectedSituations]);
  const presentation = selectedCase ? manualPresentations[`${role}/${context}/${activeSituation}/${counterpart}/${combination}`] : undefined;
  const keyPhrases = useMemo(() => {
    if (!selectedCase) return [];
    if (selectedCase.wordsToUse.length !== 3 && selectedCase.wordsToUse.length !== 4) {
      throw new Error(`Trois ou quatre formulations requises : ${combination}/${role}/${context}/${counterpart}/${selectedCase.title}`);
    }
    return selectedCase.wordsToUse.map(item => ({ intention: item.intent, words: item.text }));
  }, [combination, context, counterpart, role, selectedCase]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function" || !window.matchMedia("(max-width: 760px)").matches) return;
    const tabs = roleTabsRef.current;
    const activeTab = tabs?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!activeTab || !tabs) return;
    tabs.scrollTo({
      left: activeTab.offsetLeft - (tabs.clientWidth - activeTab.offsetWidth) / 2,
      behavior: "auto",
    });
  }, [role]);

  function changeRole(next: RoleId) {
    setRole(next);
    const nextContext = defaultContextForRole(configuration, next);
    setContext(nextContext);
    const url = new URL(window.location.href);
    url.searchParams.set("vue", next);
    url.searchParams.set("contexte", nextContext);
    window.history.replaceState(null, "", url);
  }

  function changeContext(next: ContextId) {
    if (!roleContent.contexts[next]) throw new Error(`Contexte ${next} indisponible pour ${role}`);
    setContext(next);
    const url = new URL(window.location.href);
    url.searchParams.set("contexte", next);
    window.history.replaceState(null, "", url);
  }

  function changeCombination(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("combinaison", next);
    window.location.assign(url.toString());
  }

  function toggleResultField(field: string) {
    setOpenResultFields(current => current.includes(field) ? current.filter(item => item !== field) : [...current, field]);
  }

  function toggleAllResultFields() {
    setOpenResultFields(current => current.length === resultSections.length ? [] : resultSections.map(([field]) => field));
  }

  async function copyWords(index?: number) {
    const value = index === undefined
      ? keyPhrases.map(item => `${item.intention} : ${quoteWords(item.words)}`).join("\n")
      : quoteWords(keyPhrases[index].words);
    await navigator.clipboard.writeText(value);
    const copiedKey = index === undefined ? "all" : String(index);
    setCopied(copiedKey);
    window.setTimeout(() => setCopied(current => current === copiedKey ? "" : current), 1800);
  }

  return <main className={`${styles.page} ${embedded ? styles.embedded : ""} results-design-system`} data-primary={configuration.primary} style={{ "--accent": accent, "--accent-contrast": configuration.primary === "I" ? "#202124" : "#fff" } as React.CSSProperties}>
    {!embedded && <div className={styles.previewBanner}><strong>PRÉVISUALISATION ÉDITORIALE</strong><span>Consultation des contenus intégrés manuellement · aucune modification possible ici</span></div>}
    <div className={styles.shell}>
      <header className={styles.pageHeader}>
        <Eyebrow>05 / Dans une organisation</Eyebrow>
        <PageTitle>Dans une organisation.</PageTitle>
        {configuration.intro && <PageIntro>{configuration.intro}</PageIntro>}
      </header>

      {!embedded && <section className={styles.previewControls} aria-label="Choix du profil participant">
        <label htmlFor="organisation-participant-profile"><span>Mon profil MAPP</span><strong>{configuration.label}</strong></label>
        <select id="organisation-participant-profile" value={combination} onChange={event => changeCombination(event.target.value)}>
          {manifest.configurationKeys.map(code => {
            const primary = code[0] as ProfileCode;
            const secondary = code.length === 2 ? code[1] as ProfileCode : null;
            const label = secondary ? `${profileNames[primary]} + ${profileNames[secondary]} (${code})` : `${profileNames[primary]} (${code})`;
            return <option value={code} key={code}>{label}</option>;
          })}
        </select>
      </section>}

      <nav ref={roleTabsRef} className={styles.roleTabs} aria-label="Choisir une responsabilité professionnelle" role="tablist">
        {roleOrder.map((item, index) => <button key={item} type="button" role="tab" aria-selected={role === item} onClick={() => changeRole(item)}>
          <span>{String(index + 1).padStart(2, "0")}</span><strong>{roleTitles[item]}</strong>
        </button>)}
      </nav>

      <section className={styles.roleOverview} aria-labelledby="role-overview-title">
        <div className={styles.roleVisual}>
          <Image src={roleImage.src} alt={roleImage.alt} fill sizes="(max-width: 600px) 100vw, 34vw" style={{ objectPosition: roleImage.position }} priority />
        </div>
        <div className={styles.roleCopy}>
          <div className={styles.roleCopyHeader}>
            <Eyebrow>Ton fonctionnement dans ce rôle</Eyebrow>
            <div className={styles.roleDiagramCompact}><RoleDiagram role={role} /></div>
          </div>
          <SectionTitle id="role-overview-title">{roleTitles[role]}.</SectionTitle>
          <div className={styles.rolePresentation}>
            <section className={styles.roleDefinition}>
              <span>Ton rôle</span>
              <SectionIntro>{rolePresentation.role}</SectionIntro>
            </section>
            <section className={styles.roleStrengths}>
              <span>Tes points forts</span>
              {rolePresentation.strengths.map(strength => <BodyText key={strength}>{strength}</BodyText>)}
            </section>
            <section className={styles.roleVigilance}>
              <span>Ton point de vigilance</span>
              <BodyText>{rolePresentation.vigilance}</BodyText>
            </section>
          </div>
          {role === "contribution" && ROLE_CONTEXT_IDS.contribution.filter(id => roleContent.contexts[id]).length > 1 && <div className={styles.contextSelector} role="group" aria-label="Choisir la relation de contribution">
            <span>Dans cette situation</span>
            <div>{ROLE_CONTEXT_IDS.contribution.filter(id => roleContent.contexts[id]).map(contextId => <button key={contextId} type="button" aria-pressed={context === contextId} onClick={() => changeContext(contextId)}>{roleContent.contexts[contextId]!.label}</button>)}</div>
          </div>}
        </div>
      </section>

      <section className={styles.guide} aria-labelledby="guide-title">
        <div className={styles.sectionHeading}>
          <Eyebrow>Guide pratique</Eyebrow>
          <SectionTitle id="guide-title">Tes situations professionnelles.</SectionTitle>
          <SectionIntro>Choisis une situation, puis le profil de ton interlocuteur. Les conseils s’adaptent sans perdre le contexte que tu consultes.</SectionIntro>
        </div>

        <div className={styles.categories}>
          <section className={styles.categoryPanel} aria-labelledby={`category-${activeCategoryDefinition.id}`}>
            <div className={styles.categoryWorkspace}>
              <div className={styles.categoryControls}>
                <div className={styles.panelHeading}>
                  <span className={styles.categorySelectLabel}>Choisis une catégorie</span>
                  <div className={styles.categoryMenu}>
                    <button type="button" className={styles.categoryMenuTrigger} aria-expanded={categoryMenuOpen} aria-controls="organisation-category-menu" onClick={() => setCategoryMenuOpen(open => !open)}>
                      <span>{String(manifest.categories.indexOf(activeCategoryDefinition) + 1).padStart(2, "0")}</span>
                      <strong>{activeCategoryDefinition.title}</strong>
                      <i aria-hidden="true" />
                    </button>
                    {categoryMenuOpen && <div id="organisation-category-menu" className={styles.categoryMenuOptions} role="menu">
                      {manifest.categories.map((category, categoryIndex) => <button type="button" role="menuitemradio" aria-checked={openCategory === category.id} key={category.id} onClick={() => { setOpenCategory(category.id); setCategoryMenuOpen(false); }}><span>{String(categoryIndex + 1).padStart(2, "0")}</span><strong>{category.title}</strong></button>)}
                    </div>}
                  </div>
                  <CardTitle id={`category-${activeCategoryDefinition.id}`} className={styles.visuallyHidden}>{activeCategoryDefinition.title}</CardTitle>
                </div>
                <div className={styles.situationTabs} role="tablist" aria-label={`Situations : ${activeCategoryDefinition.title}`}>
                  {activeCategoryDefinition.situations.map(situation => <button type="button" role="tab" aria-selected={activeSituation === situation.id} key={situation.id} onClick={() => setSelectedSituations(current => ({ ...current, [activeCategoryDefinition.id]: situation.id }))}>{situation.label}</button>)}
                </div>
                <div className={styles.counterpartHeading}><div><Eyebrow>Ton interlocuteur</Eyebrow><CardTitle>À qui t’adresses-tu ?</CardTitle></div></div>
                <div className={styles.profileButtons} aria-label="Profil de l’interlocuteur">
                  {profileOrder.map(code => <button type="button" key={code} aria-pressed={counterpart === code} style={{ "--profile-color": manifest.design.profileColors[code] } as React.CSSProperties} onClick={() => setCounterpart(code)}><span aria-hidden="true" /><strong>{manifest.profiles[code]}</strong></button>)}
                </div>
              </div>
              <article className={styles.result} aria-live="polite" style={{ "--counterpart-color": manifest.design.profileColors[counterpart] } as React.CSSProperties}>
                {!selectedCase ? <div className={styles.unavailableResult} role="status">
                  <Eyebrow>Contenu manuel en attente</Eyebrow>
                  <SectionTitle as="h3">{activeCategoryDefinition.situations.find(item => item.id === activeSituation)?.label ?? "Situation indisponible"}</SectionTitle>
                  <BodyText>Ce cas n’a pas encore été transmis et intégré. Aucun ancien texte ni contenu de remplacement n’est affiché à sa place.</BodyText>
                </div> : <>
                <header className={styles.resultHeader}>
                  <div className={styles.resultContext}><span aria-hidden="true" style={{ "--profile-color": manifest.design.profileColors[counterpart] } as React.CSSProperties} /><strong>{selectedCase.context ?? counterpartSubtitle(role, context, manifest.profiles[counterpart])}</strong></div>
                  <SectionTitle as="h3">{selectedCase.title}</SectionTitle>
                </header>
                <div className={styles.readingToolbar}>
                  <div><span>Ton guide personnalisé</span><strong>6 repères pour préparer ton échange</strong></div>
                  <button type="button" onClick={toggleAllResultFields}>{openResultFields.length === resultSections.length ? "Tout réduire" : "Tout afficher"}</button>
                </div>
                <div className={styles.resultAccordions}>
                  {resultSections.map(([field, number, title]) => {
                    const isOpen = openResultFields.includes(field);
                    return <section className={styles.resultAccordion} data-open={isOpen} data-featured={field === "wordsToUse"} key={field}>
                      <button type="button" className={styles.resultTrigger} aria-expanded={isOpen} aria-controls={`result-${field}`} onClick={() => toggleResultField(field)}>
                        <span className={styles.resultNumber}>{number}</span><strong>{title}</strong><span className={styles.resultPlus} aria-hidden="true">{isOpen ? "−" : "+"}</span>
                      </button>
                      {isOpen && <div id={`result-${field}`} className={styles.resultPanel}>
                        {field === "wordsToUse" ? <>
                          <ul className={styles.keyPhrases}>{keyPhrases.map((item, index) => <li key={`${item.intention}-${item.words}`}><span className={styles.phraseNumber}>{String(index + 1).padStart(2, "0")}</span><div>{item.intention && <strong>{item.intention}</strong>}<span>{quoteWords(item.words)}</span></div><button type="button" onClick={() => copyWords(index)} aria-label={`Copier la formulation ${index + 1}`}>{copied === String(index) ? "Copié" : "Copier"}</button></li>)}</ul>
                          <button type="button" className={styles.copyButton} onClick={() => copyWords()}>{copied === "all" ? "Les 3 formulations sont copiées" : "Copier les 3 formulations"}</button>
                        </> : field === "practicalAction" && presentation
                          ? <ExperimentPresentation text={selectedCase.practicalAction} {...presentation.experiment} counterpart={counterpart} />
                          : <HighlightedParagraphs text={selectedCase[field]} emphasis={presentation?.emphasis[field as keyof typeof presentation.emphasis]} counterpart={counterpart} />}
                      </div>}
                    </section>;
                  })}
                </div>
                </>}
              </article>
            </div>
          </section>
        </div>
      </section>

      <PeopleReminder />

      <nav className={styles.journeyNav} aria-label="Navigation dans le parcours">
        <div><small>Prochaine étape · 06</small><strong>Grandir</strong></div>
        {embedded
          ? <button type="button" onClick={() => onNavigate?.(6)}>Continuer <span aria-hidden="true">→</span></button>
          : <Link href={`/preview/grandir-v1?combinaison=${combination}&v=page02`}>Continuer <span aria-hidden="true">→</span></Link>}
      </nav>
    </div>
  </main>;
}
