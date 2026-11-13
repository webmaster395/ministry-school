"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { decisionFromValues, scenarioHighlights, sumValues as sum } from "@/lib/generopoly/workshop-logic.mjs";
import { DEFAULT_CONTENT, type ContentPage, type WorkshopContent } from "@/lib/generopoly/content-config";

const appPath = (path: string) => `/apps/generopoly${path.startsWith("/") ? path : `/${path}`}`;

type Values = Record<string, number | "">;
type Decision = "maintain" | "increase" | "decrease" | "suspend" | "";
type WorkshopState = {
  financeInitial?: Values;
  financeCardWhy?: string;
  financeCommitment?: number | "";
  financeAfterOne?: Values;
  financeAfterOneWhy?: string;
  financeDecision?: Decision;
  financeFinal?: Values;
  financeFinalWhy?: string;
  timeInitial?: Values;
  timeCardWhy?: string;
  timeCommitment?: number | "";
  timeAfterOne?: Values;
  timeAfterOneWhy?: string;
  timeDecision?: Decision;
  timeFinal?: Values;
  timeFinalWhy?: string;
  mirror?: string[];
};

type LocalGameSession = {
  state: WorkshopState;
  step: number;
  completed: boolean;
  financeCard: string | null;
  timeCard: string | null;
  participantCount: number | null;
};

const SESSION_STORAGE_KEY = "generopoly-progress";

const financeCategories = [
  ["savings", "💰 Épargne", 200],
  ["leisure", "🖼️ Loisirs (Sorties, achats et activités)", 150],
  ["generosity", "💚 Générosité (Dîme, offrandes, dons et projets d'Église et d'associations)", 100],
  ["projects", "🚀 Projets personnels", 180],
  ["reserve", "⛑️ Réserve pour imprévus", 120],
] as const;
const timeCategories = [
  ["family", "👫 Famille et proches (temps relationnel)", 8],
  ["rest", "🧘 Repos et loisirs (bien-être, sport, apprentissage et activités)", 7],
  ["spiritual", "✝️ Vie spirituelle (prière, lecture de la Bible, études bibliques)", 5],
  ["service", "💚 Service et solidarité (église locale, associations, bénévolat, etc.)", 3],
  ["projects", "🚀 Projets personnels (projets et objectifs)", 5],
] as const;

const financeCards = [
  { id: "car", emoji: "🚗", title: "Panne de voiture", short: "Une réparation imprévue.", amount: 300, text: "Une panne de voiture nécessite une réparation imprévue de 300 €. Il vous reste donc 450 € à répartir ce mois-ci." },
  { id: "relative", emoji: "🤝", title: "Un proche en difficulté", short: "Un proche sollicite votre aide financière.", amount: 300, text: "Un proche en difficulté sollicite votre aide financière. Cette dépense de 300 € vous laisse 450 € à répartir ce mois-ci." },
  { id: "solidarity", emoji: "🛍️", title: "Un achat qui vous fait envie", short: "Une occasion d’acheter quelque chose dont vous rêviez.", amount: 300, text: "Une occasion d’acheter quelque chose dont vous rêviez se présente. Cette dépense de 300 € vous laisse 450 € à répartir ce mois-ci." },
] as const;
const timeCards = [
  { id: "relative", emoji: "🫶", title: "Être présent", short: "Un proche traverse une période difficile et a besoin de vous.", amount: 6, text: "Un proche traverse une période difficile et a besoin de vous. Cette situation vous retire 6 heures de temps disponible." },
  { id: "solidarity", emoji: "💼", title: "Une responsabilité supplémentaire", short: "Une nouvelle mission au travail ou dans vos études mobilise davantage de votre temps.", amount: 6, text: "Une nouvelle mission au travail ou dans vos études mobilise davantage de votre temps. Cette situation vous retire 6 heures de temps disponible." },
  { id: "unexpected", emoji: "🔧", title: "Un quotidien chamboulé", short: "Un problème à régler chez vous demande du temps et perturbe votre organisation.", amount: 6, text: "Un problème à régler chez vous demande du temps et perturbe votre organisation. Cette situation vous retire 6 heures de temps disponible." },
] as const;

const mirrorQuestions = [
  "Que révèle la manière dont vous avez réparti votre argent et votre temps sur vos véritables priorités ?",
  "Qu’avez-vous choisi de réduire en premier, dans votre budget et votre emploi du temps, et pourquoi ?",
  "Qu’avez-vous choisi de préserver malgré la diminution durable de votre argent et de votre temps, et pourquoi ?",
  "Face à l’imprévu, puis à la baisse durable de vos ressources, comment vos choix ont-ils fait évoluer la place accordée à Dieu, à l’Église et aux autres ?",
];

function freshValues(categories: readonly (readonly [string, string, number])[]): Values {
  return Object.fromEntries(categories.map(([key]) => [key, 0]));
}

function decisionCode(initial: number, final: number): Exclude<Decision, ""> {
  const decision = decisionFromValues(initial, final);
  if (decision === "augmenter") return "increase";
  if (decision === "diminuer") return "decrease";
  if (decision === "suspendre") return "suspend";
  return "maintain";
}

function emptyValues(categories: readonly (readonly [string, string, number])[]): Values {
  return Object.fromEntries(categories.map(([key]) => [key, ""]));
}

// Une case laissée vide pendant la saisie vaut zéro, exactement comme le calcul
// du solde. Ainsi, le solde et le bouton de validation ne divergent jamais.
function validAllocation(values: Values) {
  return Object.values(values).every((value) => value === "" || (typeof value === "number" && Number.isFinite(value) && value >= 0));
}

function guideToField(id: string) {
  window.requestAnimationFrame(() => {
    const field = document.getElementById(id);
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.focus({ preventScroll: true });
  });
}

function ValidationButton({ valid, onValid, onInvalid, children, className = "" }: { valid: boolean; onValid: () => void; onInvalid: () => void; children: React.ReactNode; className?: string }) {
  return <button className={`primary-button ${valid ? "" : "is-inactive"} ${className}`} aria-disabled={!valid} onClick={() => valid ? onValid() : onInvalid()}>{children}</button>;
}

function useCredentials() {
  const [credentials, setCredentials] = useState<{ tableId: string; resumeToken: string; tableName: string; sessionDate: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("priorites-table");
      return stored ? JSON.parse(stored) : null;
    } catch { /* Ignore invalid local data. */ }
    return null;
  });
  const remember = (next: { tableId: string; resumeToken: string; tableName: string; sessionDate: string }) => {
    localStorage.setItem("priorites-table", JSON.stringify(next));
    setCredentials(next);
  };
  const forget = () => {
    localStorage.removeItem("priorites-table");
    localStorage.removeItem("priorites-pending");
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCredentials(null);
  };
  return { credentials, remember, forget };
}

export default function WorkshopApp() {
  const { credentials, remember, forget } = useCredentials();
  const [joined, setJoined] = useState(false);
  const [tableName, setTableName] = useState("");
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WorkshopState>({});
  const [financeCard, setFinanceCard] = useState<string | null>(null);
  const [timeCard, setTimeCard] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const content: WorkshopContent = DEFAULT_CONTENT;
  const hydrated = useRef(false);
  const credentialsRef = useRef(credentials);
  const restartButtonRef = useRef<HTMLButtonElement>(null);
  const scrollToNextStep = useRef(false);
  useEffect(() => { credentialsRef.current = credentials; }, [credentials]);

  const page = useCallback((id: string) => content.pages.find((item) => item.id === id) ?? DEFAULT_CONTENT.pages.find((item) => item.id === id)!, [content]);
  // Les libellés financiers font partie de l'expérience du jeu : on les garde
  // cohérents même si une ancienne version éditoriale est encore associée à un
  // groupe déjà créé.
  const configuredFinanceCategories = useMemo(() => financeCategories, []);
  // Les clés restent stables pour les données sauvegardées ; ces libellés sont
  // volontairement centralisés ici pour être identiques à chaque étape du temps.
  const configuredTimeCategories = useMemo(() => timeCategories, []);

  const save = useCallback(async (nextState = state, nextStep = step, completed = false, cards?: { finance?: string | null; time?: string | null }) => {
    const creds = credentialsRef.current;
    if (!creds) return false;
    setSaveStatus("saving");
    try {
      const nextFinanceCard = cards?.finance ?? financeCard;
      const nextTimeCard = cards?.time ?? timeCard;
      const session: LocalGameSession = {
        state: nextState,
        step: nextStep,
        completed,
        financeCard: nextFinanceCard,
        timeCard: nextTimeCard,
        participantCount,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      if (cards?.finance !== undefined) setFinanceCard(nextFinanceCard);
      if (cards?.time !== undefined) setTimeCard(nextTimeCard);
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveStatus("offline");
      return false;
    }
  }, [financeCard, participantCount, state, step, timeCard]);

  useEffect(() => {
    if (!joined || !hydrated.current) return;
    // Une sauvegarde groupée réduit les écritures pendant la saisie tout en
    // conservant la reprise automatique dès que le groupe marque une pause.
    const timer = window.setTimeout(() => void save(), 1000);
    return () => window.clearTimeout(timer);
  }, [state, joined, save]);

  const join = async (count: number | null, resume = false) => {
    setJoining(true); setError("");
    try {
      let nextCredentials = credentials;
      let session: LocalGameSession | null = null;
      if (resume) {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        session = stored ? JSON.parse(stored) as LocalGameSession : null;
        if (!nextCredentials || !session) throw new Error("Aucune partie à reprendre.");
      } else {
        const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        nextCredentials = {
          tableId: id,
          resumeToken: id,
          tableName: "Votre groupe",
          sessionDate: new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date()),
        };
        session = { state: {}, step: 1, completed: false, financeCard: null, timeCard: null, participantCount: count };
        remember(nextCredentials);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
      credentialsRef.current = nextCredentials;
      setTableName(nextCredentials.tableName);
      setParticipantCount(session.participantCount ?? count);
      setStep(Number(session.step) || 1); setState(session.state ?? {});
      setFinanceCard(session.financeCard ?? null); setTimeCard(session.timeCard ?? null);
      hydrated.current = true; setJoined(true); setSaveStatus("saved");
    } catch (cause) {
      if (resume) forget();
      setError(cause instanceof Error ? cause.message : "Impossible de rejoindre la session.");
    } finally { setJoining(false); }
  };

  useEffect(() => {
    if (!credentials || joined || hydrated.current || joining) return;
    void join(null, true);
  // Reprendre automatiquement la partie du téléphone tant que la session est ouverte.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials, joined, joining]);

  // Une transition validée doit toujours révéler le début de la nouvelle page.
  // Les deux frames évitent que Safari conserve l'ancienne position avant que le
  // nouvel écran soit réellement peint. Une reprise ou un rafraîchissement ne
  // passe jamais par ce drapeau et conserve donc sa position normale.
  useEffect(() => {
    if (!joined || !scrollToNextStep.current) return;
    scrollToNextStep.current = false;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [joined, step]);

  const advance = async (nextState: WorkshopState, nextStep: number, completed = false) => {
    if (completed && finalizing) return;
    if (completed) setFinalizing(true);
    setError(""); setState(nextState);
    const ok = await save(nextState, nextStep, completed);
    if (ok) {
      scrollToNextStep.current = true;
      setStep(nextStep);
    }
    if (completed) setFinalizing(false);
  };

  const restart = async () => {
    if (restarting) return;
    setRestarting(true); setError("");
    try {
      forget(); credentialsRef.current = null; hydrated.current = false;
      setJoined(false); setStep(1); setState({}); setFinanceCard(null); setTimeCard(null); setParticipantCount(null); setTableName(""); setRestartOpen(false); setSaveStatus("idle");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de réinitialiser cette partie."); }
    finally { setRestarting(false); }
  };

  const closeRestart = () => {
    setRestartOpen(false);
    window.requestAnimationFrame(() => restartButtonRef.current?.focus());
  };

  const lockCard = async (kind: "finance" | "time", id: string) => {
    setError("");
    const nextFinance = kind === "finance" ? id : financeCard;
    const nextTime = kind === "time" ? id : timeCard;
    const ok = await save(state, step, false, { finance: nextFinance, time: nextTime });
    if (ok) {
      if (kind === "finance") setFinanceCard(id);
      else setTimeCard(id);
    } else setError("La carte n’a pas pu être verrouillée. Vérifiez votre connexion et réessayez.");
  };

  if (!joined) return <JoinScreen content={page("welcome")} onJoin={(count) => join(count)} error={error} loading={joining} />;

  return (
    <div className="game-surface page-tone-light min-h-screen bg-[#fffdf9] text-[#27302f]">
      <header className="sticky top-0 z-30 border-b border-[#27302f]/10 bg-[#fffdf9]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Brand compact />
          <div className="header-actions text-xs font-medium text-[#6b7270]"><SavePill status={saveStatus} finalized={step === 10} onRetry={() => void save()} /></div>
        </div>
        <Progress step={step} onRestart={() => setRestartOpen(true)} restartRef={restartButtonRef} />
      </header>
      <main className={`mx-auto ${step === 9 ? "max-w-6xl" : "max-w-3xl"} px-4 pb-16 pt-8 sm:px-6 sm:pt-12`}>
        {error && <Notice tone="error">{error}</Notice>}
        {step === 1 && <FinancialSituation content={page("finance-situation")} onContinue={() => void advance(state, 2)} />}
        {step === 2 && <AllocationStep kind="finance" title={page("finance-normal").title} eyebrow={page("finance-normal").subtitle} intro={page("finance-normal").instruction} total={page("finance-normal").amount ?? 750} categories={configuredFinanceCategories} values={state.financeInitial} onChange={(financeInitial) => setState((old) => ({ ...old, financeInitial }))} onContinue={() => {
          const total = page("finance-normal").amount ?? 750;
          if (!validAllocation(state.financeInitial ?? freshValues(configuredFinanceCategories)) || sum(state.financeInitial) !== total) return setError(`Votre répartition doit totaliser exactement ${total} €.`);
          void advance({ ...state, financeInitial: state.financeInitial }, 3);
        }} />}
        {step === 3 && <CardEventStep kind="finance" title={page("finance-event").title} subtitle={`${page("finance-event").scenario} ${page("finance-event").instruction}`} cards={financeCards} selected={financeCard} values={state.financeAfterOne} previous={state.financeInitial} reason={state.financeAfterOneWhy ?? ""} categories={configuredFinanceCategories} total={page("finance-event").amount ?? 450} onLock={(id) => void lockCard("finance", id)} onChange={(patch) => setState((old) => ({ ...old, ...patch }))} onBack={() => setStep(2)} onContinue={() => {
          const total = page("finance-event").amount ?? 450;
          if (!financeCard) return setError("Choisissez d’abord une carte.");
          if (!validAllocation(state.financeAfterOne ?? freshValues(configuredFinanceCategories)) || sum(state.financeAfterOne) !== total) return setError(`La nouvelle répartition doit totaliser exactement ${total} €.`);
          void advance({ ...state, financeCommitment: 300 }, 4);
        }} />}
        {step === 4 && <SecondEventStep kind="finance" title={page("finance-durable").title} intro={page("finance-durable").scenario} categories={configuredFinanceCategories} previous={state.financeInitial} normalValues={state.financeInitial} values={state.financeFinal} reason={state.financeFinalWhy ?? ""} total={page("finance-durable").amount ?? 500} focusKey="generosity" churchText="En parallèle, votre église locale connaît elle aussi des difficultés. Avec l’augmentation du coût de la vie, les dons diminuent, alors que les besoins restent importants pour poursuivre ses activités, ses célébrations et ses actions." decisionPrompt={page("finance-durable").instruction} onChange={(patch) => setState((old) => ({ ...old, ...patch }))} onBack={() => setStep(3)} onContinue={() => {
          const total = page("finance-durable").amount ?? 500;
          const initial = Number(state.financeInitial?.generosity || 0);
          const next = Number(state.financeFinal?.generosity || 0);
          if (!validAllocation(state.financeFinal ?? freshValues(configuredFinanceCategories)) || sum(state.financeFinal) !== total) return setError(`Votre répartition finale doit totaliser exactement ${total} €.`);
          void advance({ ...state, financeDecision: decisionCode(initial, next) }, 5);
        }} />}
        {step === 5 && <TimeSituation content={page("time-situation")} onBack={() => setStep(4)} onContinue={() => void advance(state, 6)} />}
        {step === 6 && <TimeStart content={page("time-normal")} categories={configuredTimeCategories} state={state} setState={setState} onBack={() => setStep(5)} onContinue={() => {
          const total = page("time-normal").amount ?? 28;
          if (!validAllocation(state.timeInitial ?? freshValues(configuredTimeCategories)) || sum(state.timeInitial) !== total) return setError(`Votre répartition doit totaliser exactement ${total} heures.`);
          void advance(state, 7);
        }} />}
        {step === 7 && <CardEventStep kind="time" title={page("time-event").title} subtitle={`${page("time-event").scenario} ${page("time-event").instruction}`} cards={timeCards} selected={timeCard} values={state.timeAfterOne} previous={state.timeInitial} reason={state.timeAfterOneWhy ?? ""} categories={configuredTimeCategories} total={page("time-event").amount ?? 22} onLock={(id) => void lockCard("time", id)} onChange={(patch) => setState((old) => ({ ...old, ...patch }))} onBack={() => setStep(6)} onContinue={() => {
          const total = page("time-event").amount ?? 22;
          if (!timeCard) return setError("Choisissez d’abord une carte.");
          if (!validAllocation(state.timeAfterOne ?? freshValues(configuredTimeCategories)) || sum(state.timeAfterOne) !== total) return setError(`La nouvelle répartition doit totaliser exactement ${total} heures.`);
          void advance({ ...state, timeCommitment: 6 }, 8);
        }} />}
        {step === 8 && <SecondEventStep kind="time" title={page("time-durable").title} intro={page("time-durable").scenario} categories={configuredTimeCategories} previous={state.timeInitial} normalValues={state.timeInitial} values={state.timeFinal} reason={state.timeFinalWhy ?? ""} total={page("time-durable").amount ?? 18} focusKey="service" churchText="En parallèle, votre Église manque d’équipiers pour préparer et assurer les célébrations du week-end." decisionPrompt={page("time-durable").instruction} onChange={(patch) => setState((old) => ({ ...old, ...patch }))} onBack={() => setStep(7)} onContinue={() => {
          const total = page("time-durable").amount ?? 18;
          const initial = Number(state.timeInitial?.service || 0);
          const next = Number(state.timeFinal?.service || 0);
          if (!validAllocation(state.timeFinal ?? freshValues(configuredTimeCategories)) || sum(state.timeFinal) !== total) return setError(`Votre répartition doit totaliser exactement ${total} heures.`);
          // Toutes les décisions chiffrées sont maintenant enregistrées avant
          // d’ouvrir les résultats. Elles peuvent donc alimenter les
          // statistiques immédiatement ; les questions de réflexion de la
          // synthèse restent ensuite sauvegardées au fil de la saisie.
          void advance({ ...state, timeDecision: decisionCode(initial, next) }, 9, true);
        }} />}
        {step === 9 && <Mirror content={page("synthesis")} state={state} onChange={(mirror) => setState((old) => ({ ...old, mirror }))} onBack={() => setStep(8)} onContinue={() => {
          void advance(state, 10);
        }} />}
        {step === 10 && <Complete content={page("complete")} tableName={tableName} state={state} onRestart={() => setRestartOpen(true)} />}
      </main>
      <SiteFooter />
      {restartOpen && <RestartModal busy={restarting} error={error} onCancel={closeRestart} onConfirm={() => void restart()} />}
    </div>
  );
}

function JoinScreen({ content, onJoin, error, loading }: { content: ContentPage; onJoin: (count: number | null) => void; error: string; loading: boolean }) {
  const [count, setCount] = useState("");
  const [date] = useState(() => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()));
  const [showError, setShowError] = useState(false);
  const valid = Number(count) >= 1;
  return <main className="game-hero relative min-h-screen overflow-hidden bg-[#27302f] text-white">
    <div className="relative mx-auto flex min-h-screen max-w-lg flex-col px-5 py-7 sm:justify-center sm:py-12">
      <div className="mb-10"><Brand inverse /></div>
      <p className="mb-4 text-xs font-bold uppercase tracking-[.22em] text-[#a9d4cf]">Atelier collectif · {date || "Chargement…"}</p>
      <h1 className="font-serif text-5xl leading-[.98] tracking-[-.035em] sm:text-6xl">{content.title}</h1>
      <p className="mt-4 text-lg font-medium text-[#d7eeeb]">{content.subtitle}</p>
      <p className="mt-5 max-w-md text-base leading-7 text-white/70">{content.scenario}</p>
      <form className="mt-8 rounded-2xl bg-white p-5 text-[#192d35] shadow-xl shadow-black/15 sm:p-7" onSubmit={(event) => { event.preventDefault(); if (valid) onJoin(Number(count)); else { setShowError(true); guideToField("participant-count"); } }}>
        <label className="field-label" htmlFor="participant-count">{content.instruction}</label>
        <input id="participant-count" className={`big-input ${showError && !valid ? "is-invalid" : ""}`} inputMode="numeric" min="1" value={count} onChange={(event) => setCount(event.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="Ex. 6" autoFocus />
        {showError && !valid && <p className="field-feedback is-error">Indiquez au moins une personne dans votre groupe.</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
        <button className={`primary-button mt-6 w-full ${!valid || loading ? "is-inactive" : ""}`} aria-disabled={!valid || loading} onClick={(event) => { if (!valid || loading) { event.preventDefault(); setShowError(true); guideToField("participant-count"); } }}>{loading ? <RefreshCw className="animate-spin" size={18} /> : <>Commencer la partie <ArrowRight size={18} /></>}</button>
      </form>
      <div className="mt-7 flex items-center gap-3 text-sm text-white/55"><ShieldCheck size={18} /><span>Aucun compte ni e-mail nécessaire.</span></div>
      <div className="mt-auto pt-10"><SiteFooter inverse /></div>
    </div>
  </main>;
}

function FinancialSituation({ content, onContinue }: { content: ContentPage; onContinue: () => void }) {
  return <Section>
    <div className="situation-card situation-card-full">
      <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{content.title}</h1>
      <p className="mt-4 situation-copy">{content.scenario}</p>
      <p className="situation-copy situation-copy-follow">Chaque mois, vous devez payer votre loyer, vos crédits, vos transports, vos courses, votre carburant et vos dépenses de santé.</p>
      <p className="situation-label">{content.subtitle}</p>
      <div className="situation-list">
        <SituationRow label="Salaire mensuel" value="2 100 €" />
        <SituationRow label="Autres revenus" value="300 €" />
        <SituationRow label="Revenus du foyer" value="2 400 €" strong />
        <SituationRow label="Dépenses incompressibles" detail="Loyer, crédits, transports, courses, carburant et santé." value="− 1 650 €" />
      </div>
      <div className="situation-available"><span>Il vous reste</span><strong>{content.amount ?? 750} € <small>par mois</small></strong></div>
    </div>
    <button className="primary-button mt-6 w-full" onClick={onContinue}>OK, j’ai compris <ArrowRight size={18} /></button>
  </Section>;
}

function SituationRow({ label, detail, value, strong = false }: { label: string; detail?: string; value: string; strong?: boolean }) { return <div className={`situation-row ${strong ? "is-strong" : ""}`}><span><b>{label}</b>{detail && <small>{detail}</small>}</span><strong>{value}</strong></div>; }

function AllocationStep({ kind, title, eyebrow, intro, total, categories, values, onChange, onContinue }: { kind: "finance" | "time"; title: string; eyebrow: string; intro: string; total: number; categories: readonly (readonly [string, string, number])[]; values?: Values; onChange: (values: Values) => void; onContinue: () => void }) {
  const current = values ?? freshValues(categories);
  const remaining = total - sum(current);
  if (kind === "finance") return <BudgetAllocationStep title={title} eyebrow={eyebrow} intro={intro} total={total} categories={categories} values={current} onChange={onChange} onContinue={onContinue} />;
  return <Section>
    <StepHeading icon={<Clock3 />} eyebrow={eyebrow} title={title} intro={intro} />
    <ResourceOverview kind={kind} total={total} remaining={remaining} />
    <AllocationEditor kind={kind} categories={categories} values={current} onChange={onChange} />
    <ContinueBar remaining={remaining} kind={kind} onContinue={onContinue} />
  </Section>;
}

function BudgetAllocationStep({ title, eyebrow, intro, total, categories, values, onChange, onContinue }: { title: string; eyebrow: string; intro: string; total: number; categories: readonly (readonly [string, string, number])[]; values: Values; onChange: (values: Values) => void; onContinue: () => void }) {
  const remaining = total - sum(values);
  const [showErrors, setShowErrors] = useState(false);
  const valid = validAllocation(values) && remaining === 0;
  const guide = () => { setShowErrors(true); guideToField("finance-resource-remaining"); };
  return <Section>
    <header className="budget-header"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#a9d4cf]">{eyebrow}</p><h1 className="mt-1.5 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{title}</h1><p className="mt-3 text-sm leading-6 text-white/80">{intro}</p></header>
    <section className="budget-card">
      <h2 className="font-serif text-2xl tracking-tight">Répartissez votre budget</h2>
      <p className="mt-2 text-sm leading-6 text-[#6b7270]">Vous avez {total} € à répartir. À vous de choisir vos priorités !</p>
      <ResourceOverview kind="finance" total={total} remaining={remaining} showError={showErrors && !valid} />
      <BudgetAllocationEditor categories={categories} values={values} onChange={onChange} />
      <ValidationButton valid={valid} onValid={onContinue} onInvalid={guide} className="mt-7 w-full">Valider ma répartition <ArrowRight size={18} /></ValidationButton>
    </section>
  </Section>;
}

function ResourceOverview({ kind, total, remaining, showError = false }: { kind: "finance" | "time"; total: number; remaining: number; showError?: boolean }) {
  const unit = kind === "finance" ? "€" : "h";
  const referenceLabel = kind === "finance" ? "Votre salaire mensuel" : "Temps dans une semaine";
  const referenceValue = kind === "finance" ? "2 100 €" : "168 h";
  const referenceHint = kind === "finance" ? "Votre salaire avant les dépenses du mois." : "Le temps total dans une semaine.";
  const availableHint = kind === "finance"
    ? "Après le loyer, les factures, les courses, les transports et les remboursements de crédits."
    : "Le temps qu’il vous reste pour organiser votre semaine.";
  const over = remaining < 0;
  const amount = `${over ? "−" : ""}${Math.abs(remaining)} ${unit}`;
  return <div className="resource-overview" aria-label={`Il reste ${remaining} ${unit} à répartir sur ${total} ${unit}`}>
    <div className="resource-overview-card">
      <p>{referenceLabel}</p>
      <strong>{referenceValue}</strong>
      <span>{referenceHint}</span>
    </div>
    <div id={`${kind}-resource-remaining`} className={`resource-overview-card is-available ${over ? "is-over" : ""} ${showError ? "is-invalid" : ""}`} aria-live="polite">
      <p>Il vous reste à répartir</p>
      <strong>{amount}</strong>
      <span>{over ? "À découvert" : availableHint}</span>
    </div>
  </div>;
}

function BudgetAllocationEditor({ categories, values, onChange }: { categories: readonly (readonly [string, string, number])[]; values: Values; onChange: (values: Values) => void }) {
  const [focused, setFocused] = useState<string | null>(null);
  return <div className="budget-allocations">{categories.map(([key, label]) => <div className="budget-allocation" key={key}><label className="budget-allocation-name" htmlFor={`budget-${key}`}>{label}</label><div><div className="relative w-28"><input id={`budget-${key}`} aria-label={`Montant affecté à ${label}`} className="budget-allocation-input" inputMode="numeric" min={0} value={values[key] ?? 0} placeholder={focused === key ? "" : "0"} onFocus={() => setFocused(key)} onBlur={() => { setFocused(null); if (values[key] === "") onChange({ ...values, [key]: 0 }); }} onChange={(event) => { const raw = event.target.value.replace(/\D/g, ""); onChange({ ...values, [key]: raw === "" ? "" : Number(raw) }); }} /><span className="unit">€</span></div></div></div>)}</div>;
}

function AllocationEditor({ kind, categories, values, onChange, previous, placeholderValues, invalidKey }: { kind: "finance" | "time"; categories: readonly (readonly [string, string, number])[]; values: Values; onChange: (values: Values) => void; previous?: Values; placeholderValues?: Values; invalidKey?: string }) {
  const [focused, setFocused] = useState<string | null>(null);
  return <div className="space-y-3">
    {categories.map(([key, label]) => <div className="allocation-row" key={key}>
      <div><AllocationCategoryLabel kind={kind} label={label} htmlFor={`${kind}-${key}`} />{previous && <p className="mt-1 text-xs text-[#6b7270]">Quand tout va bien : {Number(previous[key] || 0)} {kind === "finance" ? "€" : "h"}</p>}</div>
      <div><div className="relative w-28"><input id={`${kind}-${key}`} className={`number-input ${invalidKey === key ? "is-invalid" : ""}`} inputMode="numeric" min={0} value={values[key] ?? 0} placeholder={focused === key ? "" : placeholderValues && Object.prototype.hasOwnProperty.call(placeholderValues, key) ? String(placeholderValues[key] ?? "") : "0"} onFocus={() => setFocused(key)} onBlur={() => { setFocused(null); if (values[key] === "") onChange({ ...values, [key]: 0 }); }} onChange={(event) => { const raw = event.target.value.replace(/\D/g, ""); onChange({ ...values, [key]: raw === "" ? "" : Number(raw) }); }} /><span className="unit">{kind === "finance" ? "€" : "h"}</span></div>{invalidKey === key && <p className="field-feedback is-error">Indiquez une valeur, même 0.</p>}</div>
    </div>)}
  </div>;
}

function AllocationCategoryLabel({ kind, label, htmlFor }: { kind: "finance" | "time"; label: string; htmlFor: string }) {
  if (kind === "finance") return <label htmlFor={htmlFor} className="font-semibold text-[#25493f]">{label}</label>;
  const match = label.match(/^(\S+)\s(.+?)(?:\s\((.+)\))?$/);
  if (!match) return <label htmlFor={htmlFor} className="font-semibold text-[#25493f]">{label}</label>;
  const [, emoji, name, description] = match;
  return <label htmlFor={htmlFor} className="block leading-5 text-[#25493f]"><span className="font-semibold">{emoji} {name}</span>{description && <span className="ml-1 text-sm font-normal text-[#6b7270]">({description})</span>}</label>;
}

function CardEventStep({ kind, title, subtitle, cards, selected, values, previous, reason, categories, total, onLock, onChange, onBack, onContinue }: { kind: "finance" | "time"; title: string; subtitle: string; cards: readonly { id: string; emoji: string; title: string; short: string; amount: number; text: string }[]; selected: string | null; values?: Values; previous?: Values; reason: string; categories: readonly (readonly [string, string, number])[]; total: number; onLock: (id: string) => void; onChange: (patch: Partial<WorkshopState>) => void; onBack: () => void; onContinue: () => void }) {
  const chosen = cards.find((card) => card.id === selected);
  const current = values ?? freshValues(categories);
  const valuesKey = kind === "finance" ? "financeAfterOne" : "timeAfterOne";
  const reasonKey = kind === "finance" ? "financeAfterOneWhy" : "timeAfterOneWhy";
  const allocationValid = validAllocation(current) && sum(current) === total;
  const canContinue = allocationValid;
  const [showErrors, setShowErrors] = useState(false);
  const guide = () => { setShowErrors(true); guideToField(`${kind}-resource-remaining`); };
  return <Section>
    {kind === "finance" ? <><header className="finance-event-heading"><p>Mission 1 · Étape 3</p></header><div className="event-instruction-card event-choice-introduction"><h1>{title}</h1><p className="event-instruction-copy">Vous aviez organisé votre budget et fait vos choix. Mais une dépense inattendue vient bouleverser vos plans…</p><p className="event-instruction-copy time-event-prompt">Choisissez une carte pour découvrir ce qui vient perturber votre budget.</p></div></> : <div className="event-instruction-card event-choice-introduction"><p className="event-instruction-eyebrow">Mission 2 · Étape 6</p><h1>{title}</h1><p className="event-instruction-copy">Vous aviez organisé votre semaine, trouvé un équilibre entre vos proches, vos loisirs, vos projets et vos engagements. Mais tout ne se passe pas toujours comme prévu…</p><p className="event-instruction-copy time-event-paragraph">Un événement inattendu vient bousculer votre programme. Vous allez devoir faire des choix.</p><p className="event-instruction-copy time-event-prompt">Choisissez une carte pour découvrir ce qui vient perturber votre semaine.</p></div>}
    {!chosen ? <>
      <div className="grid gap-3 sm:grid-cols-3">{cards.map((card) => <button key={card.id} className="choice-card" onClick={() => onLock(card.id)}><span className="text-3xl">{card.emoji}</span><strong>{card.title}</strong><span>{card.short}</span></button>)}</div>
      {kind === "finance" && <Notice><LockKeyhole size={17} /> Votre choix sera définitif dès que vous toucherez une carte.</Notice>}
    </> : <>
      <div className="locked-card"><div className="text-3xl">{chosen.emoji}</div><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1f756d]"><LockKeyhole size={14} /> Carte verrouillée</p><h3 className="mt-1 text-xl font-bold">{chosen.title}</h3><p className="mt-2 leading-7 text-[#6b7270]">{chosen.text}</p>{kind === "time" && <p className="mt-4 leading-7">Il vous reste donc <strong>22 h</strong> à répartir cette semaine.</p>}</div></div>
      <h3 className="mb-4 mt-8 text-xl font-bold">{kind === "finance" ? "À vous de redistribuer !" : "À vous de revoir votre programme !"}</h3>
      <ResourceOverview kind={kind} total={total} remaining={total - sum(current)} showError={showErrors && !allocationValid} />
      <AllocationEditor kind={kind} categories={categories} values={current} previous={previous} onChange={(next) => onChange({ [valuesKey]: next })} />
      <TextQuestion id={`${kind}-reason`} label={kind === "finance" ? "Pourquoi avez-vous choisi de répartir votre budget ainsi ?" : "Pourquoi avez-vous choisi de répartir votre temps ainsi ?"} value={reason} onChange={(value) => onChange({ [reasonKey]: value })} placeholder="Expliquez les arbitrages de votre table…" />
      <div className="mt-8 flex gap-3"><SecondaryButton onClick={onBack} /><ValidationButton valid={canContinue} onValid={onContinue} onInvalid={guide} className="flex-1">Valider cette étape <ArrowRight size={18} /></ValidationButton></div>
    </>}
  </Section>;
}

function SecondEventStep({ kind, title, intro, categories, previous, normalValues, values, reason, total, focusKey, churchText, decisionPrompt, onChange, onBack, onContinue }: { kind: "finance" | "time"; title: string; intro: string; categories: readonly (readonly [string, string, number])[]; previous?: Values; normalValues?: Values; values?: Values; reason: string; total: number; focusKey: string; churchText: string; decisionPrompt?: string; onChange: (patch: Partial<WorkshopState>) => void; onBack: () => void; onContinue: () => void }) {
  // À la baisse durable, on ne réinjecte jamais les anciens montants : ils ne
  // servent que de repères visuels gris dans les placeholders.
  const current = values ?? emptyValues(categories);
  // La situation normale reste l'unique référence : elle ne doit jamais être
  // remplacée par la répartition de l'imprévu ponctuel.
  const reference = normalValues ?? previous ?? freshValues(categories);
  const valuesKey = kind === "finance" ? "financeFinal" : "timeFinal";
  const reasonKey = kind === "finance" ? "financeFinalWhy" : "timeFinalWhy";
  const unit = kind === "finance" ? "€" : "h";
  const previousFocus = Number(reference[focusKey] || 0);
  const allocationValid = validAllocation(current) && sum(current) === total;
  const normalFocus = Number(reference[focusKey] || 0);
  const canContinue = allocationValid;
  const [showErrors, setShowErrors] = useState(false);
  const guide = () => { setShowErrors(true); guideToField(`${kind}-resource-remaining`); };
  return <Section>
    <div className="event-instruction-card">
      <div className="event-instruction-icon"><Sparkles size={22} /></div>
      <p className="event-instruction-eyebrow">{kind === "finance" ? "Mission 1 · Dernier choix" : "Mission 2 · Dernier choix"}</p>
      <h1>{title}</h1>
      {kind === "finance" ? <>
        <p className="event-instruction-copy">Le coût de la vie ne cesse d’augmenter. Entre la hausse des prix de l’alimentation, de l’électricité, du carburant, des transports et du logement, vos dépenses incompressibles pèsent de plus en plus lourd sur votre budget.</p>
        <p className="event-instruction-copy">Alors qu’il vous restait auparavant <strong>750 €</strong> chaque mois, vous ne disposez désormais plus que de <strong>{total} € à répartir</strong>. Cette diminution n’est pas ponctuelle : votre situation financière a changé durablement.</p>
      </> : <p className="event-instruction-copy">{intro}</p>}
      <div className="event-instruction-divider" />
      <p className="event-instruction-copy">{churchText}</p>
      {kind === "finance" ? <p className="event-instruction-question">Vous aviez prévu de consacrer <strong>{normalFocus} €</strong> à la générosité en donnant à votre église locale. <span>Que décidez-vous ?</span></p> : <p className="event-instruction-question">Vous aviez prévu de consacrer <strong>{previousFocus} {unit}</strong> au service et à la solidarité. <span>{decisionPrompt || "Que décidez-vous ?"}</span></p>}
    </div>
    <h3 className="mb-4 mt-8 text-xl font-bold">À vous de redistribuer !</h3>
    <ResourceOverview kind={kind} total={total} remaining={total - sum(current)} showError={showErrors && !allocationValid} />
    <AllocationEditor kind={kind} categories={categories} values={current} previous={reference} onChange={(next) => onChange({ [valuesKey]: next })} />
    <TextQuestion id={`${kind}-final-reason`} label="Pourquoi avez-vous fait ces choix ?" value={reason} onChange={(value) => onChange({ [reasonKey]: value })} placeholder="Expliquez ce que votre groupe a choisi de préserver ou de réduire…" />
    <div className="mt-8 flex gap-3"><SecondaryButton onClick={onBack} /><ValidationButton valid={canContinue} onValid={onContinue} onInvalid={guide} className="flex-1">Continuer <ArrowRight size={18} /></ValidationButton></div>
  </Section>;
}

function TimeSituation({ content, onBack, onContinue }: { content: ContentPage; onBack: () => void; onContinue: () => void }) {
  const commitments = [["Sommeil", 56], ["Travail ou études", 40], ["Transports", 7], ["Repas et hygiène", 21], ["Tâches et obligations", 16]];
  const introduction = "Une semaine compte 168 heures. Entre le sommeil, le travail, les déplacements et les obligations du quotidien, une grande partie de votre temps est déjà occupée.";
  const discovery = "Découvrez comment se répartissent ces heures et combien il vous reste réellement pour vos proches, vos loisirs, votre vie spirituelle et vos engagements.";
  return <Section>
    <div className="situation-card time-situation-card-full">
      <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{content.title}</h1>
      <p className="mt-4 situation-copy">{introduction}</p>
      <p className="mt-6 situation-copy">{discovery}</p>
      <p className="situation-label">Voici comment se répartissent les heures incontournables de votre semaine</p>
      <div className="situation-list">{commitments.map(([label, hours]) => <SituationRow key={label} label={String(label)} value={`${hours} h`} />)}</div>
      <div className="situation-available"><span>Il vous reste chaque semaine</span><strong>{content.amount ?? 28} h</strong></div>
      <p className="mt-5 situation-copy">{content.instruction}</p>
    </div>
    <div className="mt-6 flex gap-3"><SecondaryButton onClick={onBack} /><button className="primary-button flex-1" onClick={onContinue}>OK, j’ai compris <ArrowRight size={18} /></button></div>
  </Section>;
}

function TimeStart({ content, categories, state, setState, onBack, onContinue }: { content: ContentPage; categories: readonly (readonly [string, string, number])[]; state: WorkshopState; setState: React.Dispatch<React.SetStateAction<WorkshopState>>; onBack: () => void; onContinue: () => void }) {
  const total = content.amount ?? 28;
  const values = state.timeInitial ?? freshValues(categories);
  const remaining = total - sum(values);
  const [showErrors, setShowErrors] = useState(false);
  const valid = validAllocation(values) && remaining === 0;
  const guide = () => { setShowErrors(true); guideToField("time-resource-remaining"); };
  return <Section>
    <StepHeading icon={<Clock3 />} eyebrow={content.subtitle} title={content.title} intro={content.instruction} />
    <ResourceOverview kind="time" total={total} remaining={remaining} showError={showErrors && !valid} />
    <AllocationEditor kind="time" categories={categories} values={values} onChange={(timeInitial) => setState((old) => ({ ...old, timeInitial }))} />
    <div className="mt-8 flex gap-3"><SecondaryButton onClick={onBack} /><ValidationButton valid={valid} onValid={onContinue} onInvalid={guide} className="flex-1">Valider les {total} heures <ArrowRight size={18} /></ValidationButton></div>
  </Section>;
}

function Mirror({ content, state, onChange, onBack, onContinue }: { content: ContentPage; state: WorkshopState; onChange: (answers: string[]) => void; onBack: () => void; onContinue: () => void }) {
  const answers = (state.mirror ?? ["", "", "", ""]).slice(0, 4);
  const questions = content.questions?.length === 4 ? content.questions : mirrorQuestions;
  const [activeTab, setActiveTab] = useState<"finance" | "time">("finance");
  const [showFaithDetails, setShowFaithDetails] = useState(false);
  const valid = true;
  return <Section>
    <header className="synthesis-intro"><p>{content.subtitle}</p><h1>{content.title}</h1><span>{content.scenario}</span></header>
    <div className="synthesis-tabs" role="tablist"><button className={activeTab === "finance" ? "active" : ""} role="tab" aria-selected={activeTab === "finance"} onClick={() => setActiveTab("finance")}>Votre budget</button><button className={activeTab === "time" ? "active" : ""} role="tab" aria-selected={activeTab === "time"} onClick={() => setActiveTab("time")}>Votre temps</button></div>
    {activeTab === "finance" ? <SynthesisSection title="Votre argent" intro="Vos répartitions réelles dans les trois situations." icon={<Coins />}><SituationTriptych kind="finance" initial={state.financeInitial} punctual={state.financeAfterOne} durable={state.financeFinal} /></SynthesisSection> : <SynthesisSection title="Votre temps" intro="Vos heures réellement réparties à chaque étape." icon={<Clock3 />}><SituationTriptych kind="time" initial={state.timeInitial} punctual={state.timeAfterOne} durable={state.timeFinal} /></SynthesisSection>}
    <div className="synthesis-questions">{questions.slice(0, 3).map((question, index) => <article className={`reflection-card reflection-${index + 1}`} key={question}><p>0{index + 1} · {index === 0 ? "Quand tout va bien" : index === 1 ? "Face à un imprévu ponctuel" : "Quand votre situation se dégrade durablement"}</p><TextQuestion id={`mirror-${index}`} label={question} value={answers[index] ?? ""} onChange={(value) => { const next = [...answers]; next[index] = value; onChange(next); }} placeholder="Votre réponse collective…" /></article>)}</div>
    <section className="faith-mirror"><p>Votre vie spirituelle, votre église locale et les autres dans vos priorités</p><span>Quand vos ressources diminuent durablement, la générosité financière, la vie spirituelle, le service et les autres priorités peuvent évoluer.</span><DecisionConclusions state={state} /><button type="button" className="faith-details-toggle" aria-expanded={showFaithDetails} onClick={() => setShowFaithDetails((current) => !current)}><span>Détails des résultats</span><b aria-hidden="true">{showFaithDetails ? "−" : "+"}</b></button>{showFaithDetails && <div className="faith-details-panel"><FaithComparison state={state} /></div>}<TextQuestion id="mirror-3" label="Face à l’imprévu, puis à la baisse durable de vos ressources, que révèlent vos choix sur la place que vous accordez à votre vie spirituelle, à votre église locale et aux autres ?" value={answers[3] ?? ""} onChange={(value) => { const next = [...answers]; next[3] = value; onChange(next); }} placeholder="Votre réponse collective…" /></section>
    <div className="mt-8 flex gap-3"><SecondaryButton onClick={onBack} /><ValidationButton valid={valid} onValid={onContinue} onInvalid={() => undefined} className="flex-1">Terminer <Check size={18} /></ValidationButton></div>
  </Section>;
}

function SynthesisSection({ title, intro, icon, children }: { title: string; intro: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="synthesis-section"><div className="synthesis-section-heading">{icon}<div><h2>{title}</h2><p>{intro}</p></div></div>{children}</section>; }
function HighlightCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="highlight-card"><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>; }
function FaithStatus({ initial, current }: { initial: number | "" | undefined; current: number | "" | undefined }) {
  if (initial === undefined || initial === "" || current === undefined || current === "") return null;
  const start = Number(initial);
  const value = Number(current);
  const decision = decisionFromValues(start, value);
  const labels: Record<string, string> = { augmenter: "Augmenté", diminuer: "Diminué", maintenir: "Maintenu", suspendre: "Suspendu", "rester à zéro": "Resté à zéro" };
  const tone = decision === "augmenter" ? "up" : decision === "maintenir" || decision === "rester à zéro" ? "stable" : "down";
  const direction = decision === "augmenter" ? "↗" : decision === "maintenir" || decision === "rester à zéro" ? "=" : "↘";
  const percentage = start === 0 ? null : Math.round(((value - start) / start) * 100);
  const percentageText = percentage === null ? "" : `${percentage > 0 ? "+" : percentage < 0 ? "−" : ""}${Math.abs(percentage)} % · `;
  return <span className={`faith-status ${tone}`}>{direction} {percentageText}{labels[decision]}</span>;
}
function decisionVerb(initial: number | "" | undefined, current: number | "" | undefined) {
  if (initial === undefined || initial === "" || current === undefined || current === "") return null;
  const decision = decisionFromValues(Number(initial), Number(current));
  return decision === "rester à zéro" ? "maintenir à zéro" : decision;
}
function DurableConclusion({ icon, title, initial, durable, kind }: { icon: string; title: string; initial: number | "" | undefined; durable: number | "" | undefined; kind: "finance" | "time" }) {
  if (initial === undefined || initial === "" || durable === undefined || durable === "") return <article className="durable-conclusion"><h3>{icon} {title}</h3><p>Cette décision apparaîtra lorsque la répartition sera complétée.</p></article>;
  const start = Number(initial);
  const value = Number(durable);
  const decision = decisionFromValues(start, value);
  const percentage = start > 0 ? Math.round(Math.abs((value - start) / start * 100)) : null;
  const change = percentage === null ? null : `${percentage} %`;
  const text = kind === "finance"
    ? decision === "augmenter" ? <>d’<strong>augmenter votre générosité financière{change ? ` de ${change}` : ""}</strong>.</> : decision === "diminuer" ? <>de <strong>diminuer votre générosité financière de {change}</strong>.</> : decision === "suspendre" ? <>de <strong>suspendre votre générosité financière</strong>.</> : decision === "rester à zéro" ? <>de <strong>maintenir votre générosité financière à zéro</strong>.</> : <>de <strong>maintenir votre générosité financière</strong>.</>
    : decision === "augmenter" ? <>d’<strong>augmenter{change ? ` de ${change}` : ""} le temps consacré à y servir</strong>.</> : decision === "diminuer" ? <>de <strong>réduire de {change} le temps consacré à y servir</strong>.</> : decision === "suspendre" ? <>de <strong>suspendre le temps consacré à y servir</strong>.</> : decision === "rester à zéro" ? <>de <strong>maintenir à zéro le temps consacré à y servir</strong>.</> : <>de <strong>maintenir le temps consacré à y servir</strong>.</>;
  const context = kind === "finance" ? "Alors que votre budget diminuait et que votre église locale avait besoin de soutien, vous avez choisi " : "Alors que votre temps se faisait plus rare et que votre église locale recherchait des bénévoles, vous avez choisi ";
  return <article className="durable-conclusion"><h3>{icon} {title}</h3><p>{context}{text}</p></article>;
}
function DecisionConclusions({ state }: { state: WorkshopState }) {
  return <section className="decision-conclusions" aria-label="Vos décisions face à la baisse durable"><DurableConclusion icon="💚" title="Générosité financière" kind="finance" initial={state.financeInitial?.generosity} durable={state.financeFinal?.generosity} /><DurableConclusion icon="🤝" title="Temps consacré à servir" kind="time" initial={state.timeInitial?.service} durable={state.timeFinal?.service} /></section>;
}
function FaithComparison({ state }: { state: WorkshopState }) {
  const rows = [{ icon: "💚", label: "Générosité", detail: "Dîme, offrandes, dons et projets d'Église et d'associations", unit: "€", values: [state.financeInitial?.generosity, state.financeAfterOne?.generosity, state.financeFinal?.generosity] }, { icon: "✝️", label: "Vie spirituelle", detail: "Prière, lecture de la Bible, études bibliques", unit: "h", values: [state.timeInitial?.spiritual, state.timeAfterOne?.spiritual, state.timeFinal?.spiritual] }, { icon: "💚", label: "Service et solidarité", detail: "Église locale, associations, bénévolat, etc.", unit: "h", values: [state.timeInitial?.service, state.timeAfterOne?.service, state.timeFinal?.service] }];
  const headers = [["teal", "Situation normale"], ["orange", "Imprévu"], ["pink", "Baisse durable"]] as const;
  return <div className="faith-cards">{rows.map((row) => <article className="faith-card" key={row.label}><h3>{row.icon} {row.label}</h3><p>{row.detail}</p><div className="faith-card-values">{headers.map(([tone, label], index) => { const value = row.values[index]; return <div className={tone} key={tone}><small>{label}</small><strong>{value === undefined || value === "" ? "—" : `${Number(value)} ${row.unit}`}</strong>{index > 0 && <FaithStatus initial={row.values[0]} current={value} />}</div>; })}</div></article>)}</div>;
}
function EvolutionBadge({ base, value }: { base: number; value: number }) {
  if (base === value) return <span className="evolution-badge stable">= Maintenu</span>;
  if (value === 0) return <span className="evolution-badge down">↘ −100 % · Suspendu</span>;
  if (base === 0) return <span className="evolution-badge up">↗ Augmenté</span>;
  const percent = Math.round((value - base) / base * 100);
  return percent > 0 ? <span className="evolution-badge up">↗ +{percent} % · Augmenté</span> : <span className="evolution-badge down">↘ {percent} % · Baissé</span>;
}
function SituationTriptych({ kind, initial, punctual, durable }: { kind: "finance" | "time"; initial?: Values; punctual?: Values; durable?: Values }) {
  const [activeSituation, setActiveSituation] = useState(0);
  const categories = kind === "finance" ? [["savings", "💰", "Épargne", ""], ["leisure", "🖼️", "Loisirs", ""], ["generosity", "💚", "Générosité", "Dîme, offrandes, dons et projets d'Église et d'associations"], ["projects", "🚀", "Projets", ""], ["reserve", "⛑️", "Réserve d’urgence", ""]] as const : [["family", "👫", "Famille et proches", "temps relationnel"], ["rest", "🧘", "Repos et loisirs", "bien-être, sport, apprentissage et activités"], ["spiritual", "✝️", "Vie spirituelle", "prière, lecture de la Bible, études bibliques"], ["service", "💚", "Service et solidarité", "église locale, associations, bénévolat, etc."], ["projects", "🚀", "Projets personnels", "projets et objectifs"]] as const;
  const unit = kind === "finance" ? "€" : "h";
  const situations = kind === "finance" ? [{ tone: "teal", index: "01", title: "Quand tout va bien", amount: "750 €", available: "", copy: "Comment répartissez-vous vos 750 € disponibles ?", values: initial }, { tone: "orange", index: "02", title: "Face à un imprévu ponctuel", amount: "450 €", available: "", copy: "Que modifiez-vous lorsqu’une dépense inattendue apparaît ?", values: punctual }, { tone: "pink", index: "03", title: "Quand votre situation se dégrade durablement", amount: "500 €", available: "", copy: "Que choisissez-vous lorsque votre budget diminue et que votre Église a besoin de soutien ?", values: durable }] : [{ tone: "teal", index: "01", title: "Situation normale", amount: "28 h", available: "disponibles", copy: "Votre temps disponible habituel.", values: initial }, { tone: "orange", index: "02", title: "Imprévu ponctuel", amount: "22 h", available: "disponibles", copy: "Votre temps disponible après l’imprévu.", values: punctual }, { tone: "pink", index: "03", title: "Changement durable", amount: "18 h", available: "disponibles", copy: "Votre nouveau temps disponible chaque semaine.", values: durable }];
  return <><div className="triptych-viewport"><div className={`situation-triptych mobile-situation-${activeSituation}`}>{situations.map((situation, situationIndex) => {
    const highlights = situationIndex === 0 ? { largestDecrease: [], mostPreserved: [] } : scenarioHighlights(initial, situation.values, categories.map(([key]) => key));
    return <article className={`situation-rectangle ${situation.tone}`} key={situation.index}><p className="situation-index">{situation.index} · {situation.title}</p><strong className="situation-total">{situation.amount}</strong>{situation.available && <small className="situation-available-label">{situation.available}</small>}<span className="situation-description">{situation.copy}</span><div className="situation-values">{categories.map(([key, emoji, label, description]) => { const hasValue = Boolean(situation.values && Object.prototype.hasOwnProperty.call(situation.values, key)); const hasBase = Boolean(initial && Object.prototype.hasOwnProperty.call(initial, key)); const value = hasValue ? Number(situation.values?.[key]) : 0; const base = hasBase ? Number(initial?.[key]) : 0; return <div key={key}><p><span className="font-semibold">{emoji} {label}</span>{description && <small className="ml-1 font-normal opacity-75">({description})</small>}</p><div className="situation-value-line"><strong>{hasValue ? `${value} ${unit}` : "—"}</strong>{situationIndex > 0 && hasValue && hasBase && <EvolutionBadge base={base} value={value} />}</div>{highlights.largestDecrease.includes(key) && <span className="scenario-marker decrease">↘ Plus forte baisse</span>}{highlights.mostPreserved.includes(key) && <span className="scenario-marker preserved">✓ La plus préservée</span>}</div>; })}</div></article>;
  })}</div></div><div className="mobile-situation-controls"><button onClick={() => setActiveSituation((current) => Math.max(0, current - 1))} aria-label="Situation précédente" disabled={activeSituation === 0}>‹</button><span>{activeSituation + 1}/3</span><button onClick={() => setActiveSituation((current) => Math.min(2, current + 1))} aria-label="Situation suivante" disabled={activeSituation === 2}>›</button></div></>;
}

function Complete({ content, state: _state, onRestart }: { content: ContentPage; tableName: string; state: WorkshopState; onRestart: () => void }) {
  return <div className="py-10 text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#d9eadf] text-[#276847]"><CheckCircle2 size={42} /></div><h1 className="mt-8 font-serif text-4xl sm:text-5xl">{content.title}</h1><p className="mt-4 text-lg text-[#64777a]">{content.subtitle}</p><button className="secondary-button mx-auto mt-8" onClick={onRestart}><RefreshCw size={17} /> Recommencer</button><p className="mt-10 text-xs font-bold uppercase tracking-[.16em] text-[#1f756d]">Ministry School by MLK Formation</p></div>;
}

function SummaryCard({ title, icon, initial, final, categories, unit, base, commitment }: { title: string; icon: React.ReactNode; initial?: Values; final?: Values; categories: readonly (readonly [string, string, number])[]; unit: string; base: number; commitment: number }) {
  const reductions = categories.filter(([key]) => Number(final?.[key] || 0) < Number(initial?.[key] || 0)).map(([, label]) => label);
  return <div className="summary-card"><div className="mb-5 flex items-center gap-3 font-bold">{icon}<span>{title}</span></div><p className="summary-kicker">Avant l’imprévu — {unit === "€" ? "votre budget habituel" : "votre semaine habituelle"}</p>{categories.map(([key, label]) => { const before = Number(initial?.[key] || 0); const after = Number(final?.[key] || 0); const delta = after - before; return <div className="summary-row" key={key}><div className="flex justify-between gap-3 text-sm"><span>{label}</span><strong>{before} {unit} <span className="font-normal opacity-60">({Math.round(before / base * 100)} %)</span></strong></div><div className="summary-track"><span style={{ width: `${Math.min(100, before / base * 100)}%` }} /></div><div className="flex justify-between gap-3 pt-2 text-sm"><span className="text-[#6b7270]">Après</span><strong>{after} {unit} <span className={delta < 0 ? "text-red-600" : delta > 0 ? "text-[#28704c]" : "text-[#6b7270]"}>({delta === 0 ? "inchangé" : `${delta > 0 ? "+" : ""}${delta} ${unit}`})</span></strong></div></div>; })}<div className="summary-commitment">Imprévu : <strong>{commitment} {unit}</strong> · Pourcentages calculés sur {base} {unit}.</div><p className="mt-4 text-sm leading-6 text-[#6b7270]">{reductions.length ? `Vous avez réduit ${reductions.slice(0, 2).join(" et ")}${reductions.length > 2 ? " ainsi que d’autres activités" : ""}.` : "Vous avez préservé les catégories de votre répartition."}</p></div>;
}

function Progress({ step, onRestart, restartRef }: { step: number; onRestart: () => void; restartRef: React.RefObject<HTMLButtonElement | null> }) {
  const phase = step === 1 ? 1 : step <= 4 ? 2 : step <= 8 ? 3 : 4;
  const phaseProgress = step === 1 ? .5 : step === 2 ? .2 : step === 3 ? .6 : step === 4 ? 1 : step === 5 ? .18 : step === 6 ? .42 : step === 7 ? .7 : step === 8 ? 1 : step === 9 ? .5 : 1;
  const phases = [["Votre situation", "#F4A340"], ["Votre argent", "#28BFC3"], ["Votre temps", "#E9A3B3"], ["Vos choix", "#C7E76C"]] as const;
  return <div className="progress-shell mx-auto max-w-6xl px-4 pb-3 sm:px-6"><div className="progress-journey">{phases.map(([label, color], index) => { const active = phase - 1 === index; const status = active ? phaseProgress : phase > index + 1 ? 1 : 0; const markerPosition = Math.max(5, Math.min(95, status * 100)); return <div key={label} className={`progress-phase ${active ? "is-active" : ""} ${phase > index + 1 ? "is-complete" : ""}`}><div className="progress-rail"><span className="progress-fill" style={{ width: `${status * 100}%`, background: color }} />{active && <span className="mascot-marker" style={{ left: `${markerPosition}%` }}><img src={appPath("/generopoly-marker.png")} alt={`Progression : ${label}`} /></span>}</div><span>{label}</span></div>; })}</div><button ref={restartRef} className="restart-button progress-restart" onClick={onRestart} aria-label="Recommencer la partie"><RefreshCw size={14} aria-hidden="true" /><span className="restart-label">Recommencer</span></button></div>;
}

function RestartModal({ busy, error, onCancel, onConfirm }: { busy: boolean; error: string; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFirst = () => cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); return; }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
      if (!focusable?.length) return;
      const items = Array.from(focusable);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.requestAnimationFrame(focusFirst);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [onCancel]);
  if (typeof document === "undefined") return null;
  return createPortal(<div className="restart-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}><div ref={dialogRef} className="restart-dialog" role="dialog" aria-modal="true" aria-labelledby="restart-title" aria-describedby="restart-copy"><h2 id="restart-title">Recommencer la partie&nbsp;?</h2><p id="restart-copy">Votre progression et vos réponses non validées seront effacées. Vous reviendrez à l’accueil de Généropoly.</p>{error && <p className="restart-error" role="alert">{error}</p>}<div className="restart-actions"><button ref={cancelRef} className="secondary-button" onClick={onCancel} disabled={busy}>Annuler</button><button className="primary-button" onClick={onConfirm} disabled={busy}>{busy ? "Réinitialisation…" : "Oui, recommencer"}</button></div></div></div>, document.body);
}

function Brand({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) { if (compact) return <div className="brand-lockup brand-lockup-compact"><span className="brand-ministry">Ministry School</span><span className="brand-divider" aria-hidden="true" /><span className="brand-game">Généropoly</span></div>; return <div className={`brand-lockup flex items-center gap-3 ${inverse ? "is-inverse" : ""}`}>{inverse ? <><img src={appPath("/ministry-school-icons.png")} alt="" className="ministry-symbols" /><span className="brand-ministry">Ministry School</span></> : <><span className="brand-ministry">Ministry School</span><span className="brand-divider" /><span className="brand-mlk">MLK Formation</span><span className="brand-game">Généropoly</span></>}</div>; }
function SiteFooter({ inverse = false }: { inverse?: boolean }) { return <footer className={`mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 border-t px-5 py-7 text-center text-xs sm:flex-row sm:text-left ${inverse ? "border-white/12 text-white/55" : "border-[#27302f]/10 text-[#6b7270]"}`}><span>Ministry School by MLK Formation</span><nav className="flex items-center gap-4"><a className="underline-offset-4 hover:underline" href="/mentions-legales">Mentions légales</a></nav></footer>; }
function SavePill({ status, finalized, onRetry }: { status: string; finalized: boolean; onRetry: () => void }) { if (finalized) return null; const map: Record<string, string> = { idle: "", saving: "Sauvegarde…", saved: "Progression sauvegardée", offline: "À resynchroniser" }; return <button onClick={status === "offline" ? onRetry : undefined} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${status === "offline" ? "bg-amber-100 text-amber-800" : "bg-white/70"}`}>{status === "saving" || status === "offline" ? <RefreshCw size={12} className={status === "saving" ? "animate-spin" : ""} /> : <Check size={12} />}{map[status]}</button>; }
function Section({ children }: { children: React.ReactNode }) { return <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">{children}</section>; }
function StepHeading({ icon, eyebrow, title, intro }: { icon: React.ReactNode; eyebrow: string; title: string; intro?: string }) { return <header className="mb-8"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3f3] text-[#1f756d]">{icon}</div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1f756d]">{eyebrow}</p><h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{title}</h1>{intro && <p className="mt-4 text-lg leading-8 text-[#6b7270]">{intro}</p>}</header>; }
function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" }) { return <div className={`my-5 flex items-start gap-3 rounded-2xl p-4 text-sm ${tone === "error" ? "bg-red-50 text-red-700" : "bg-[#f7f4ee] text-[#27302f]"}`}>{children}</div>; }
function ContinueBar({ remaining, kind, onContinue }: { remaining: number; kind: "finance" | "time"; onContinue: () => void }) { return <ValidationButton valid={remaining === 0} onValid={onContinue} onInvalid={() => guideToField(`${kind}-resource-remaining`)} className="mt-8 w-full">Valider ma répartition <ArrowRight size={18} /></ValidationButton>; }
function TextQuestion({ label, value, onChange, placeholder, index, id }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; index?: number; id?: string }) { return <div className="mt-7"><label className="mb-3 flex gap-3 text-base font-bold leading-6" htmlFor={id}>{index && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf3f3] text-sm text-[#1f756d]">{index}</span>}<span>{label}</span></label><textarea id={id} className="text-area" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={1200} /></div>; }
function SecondaryButton({ onClick }: { onClick: () => void }) { return <button className="secondary-button" onClick={onClick} aria-label="Étape précédente"><ArrowLeft size={18} /><span className="hidden sm:inline">Retour</span></button>; }
