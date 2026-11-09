"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import {
  classifySpiritualGifts,
  giftScaleLabels,
  isSpiritualGiftsV2Complete,
  spiritualGiftQuestions,
  type GiftCategory,
} from "@/lib/apps/spiritual-gifts-v2";
import styles from "./SpiritualGiftsJourney.module.css";

type Stage = "intro" | "guide" | "questions" | "analysis" | "reveal" | "chapters" | "category" | "gift" | "summary";
const storageKey = "ministry-spiritual-gifts-v3-21-draft";
function readDraft() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as { answers?: Record<string, unknown>; index?: number } | null; }
  catch { window.localStorage.removeItem(storageKey); return null; }
}
const categories: Array<{ id: GiftCategory; title: string; copy: string }> = [
  { id: "exercised", title: "Les dons que tu exerces", copy: "D’après tes réponses, ces dons semblent particulièrement présents et exercés dans ta vie." },
  { id: "developing", title: "Les dons à développer", copy: "Tes réponses laissent apparaître des signes de ces dons, mais leur exercice semble encore occasionnel." },
  { id: "less_visible", title: "Les dons à explorer", copy: "Ces dons ne semblent pas particulièrement manifestés actuellement. Cela ne ferme aucune porte." },
];
const categoryGuidance: Record<GiftCategory, { meaning: string; next: string }> = {
  exercised: {
    meaning: "Tes réponses montrent que tu reconnais souvent ces dons dans ta vie et que tu sembles déjà les exercer. Ce résultat reste une invitation au discernement, pas une confirmation définitive.",
    next: "Continue de les exercer avec humilité. Observe leurs fruits, demande l’avis de chrétiens matures et veille à ce qu’ils servent les autres plutôt que ta propre reconnaissance.",
  },
  developing: {
    meaning: "Certains signes de ces dons apparaissent dans tes réponses, mais ils ne semblent pas encore réguliers. Ils peuvent être présents sans avoir encore trouvé beaucoup d’occasions de s’exprimer.",
    next: "Prie, demande conseil et choisis des occasions simples de servir. Avance sans te mettre de pression et vérifie avec le temps ce qui porte réellement du fruit.",
  },
  less_visible: {
    meaning: "Ces dons apparaissent peu dans tes réponses aujourd’hui. Cela ne signifie pas que Dieu ne pourra jamais les utiliser dans ta vie, ni qu’il te manque quelque chose.",
    next: "Concentre-toi d’abord sur les dons qui ressortent davantage. Tu peux continuer à découvrir les autres avec curiosité, sans chercher à provoquer une expérience.",
  },
};
const categoryAccents: Record<GiftCategory, string> = {
  exercised: "#28503C",
  developing: "#50091D",
  less_visible: "#4D2577",
};

export default function SpiritualGiftsJourney({ initial, saving, onBack, onSave }: {
  initial: Record<string, unknown>;
  saving: boolean;
  onBack: () => void;
  onSave: (answers: Record<string, unknown>) => Promise<void>;
}) {
  const initiallyComplete = isSpiritualGiftsV2Complete(initial);
  const [draft] = useState(readDraft);
  const [stage, setStage] = useState<Stage>(initiallyComplete ? "chapters" : "intro");
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => initiallyComplete ? initial : { ...initial, ...(draft?.answers ?? {}) });
  const [index, setIndex] = useState(() => initiallyComplete ? 0 : Math.min(spiritualGiftQuestions.length - 1, Math.max(0, draft?.index ?? 0)));
  const [giftIndex, setGiftIndex] = useState(0);
  const [categoryId, setCategoryId] = useState<GiftCategory>("exercised");
  const [error, setError] = useState("");
  const results = useMemo(() => classifySpiritualGifts(answers), [answers]);
  const grouped = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, results.filter((gift) => gift.category === category.id)])), [results]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [stage, index, giftIndex]);

  const select = (value: number) => {
    const next = { ...answers, [spiritualGiftQuestions[index].id]: value };
    setAnswers(next);
    window.localStorage.setItem(storageKey, JSON.stringify({ answers: next, index }));
  };
  const nextQuestion = () => {
    if (index < spiritualGiftQuestions.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, index: nextIndex }));
    } else finish();
  };
  const finish = async () => {
    if (!isSpiritualGiftsV2Complete(answers)) return;
    setStage("analysis"); setError("");
    try {
      await onSave({ ...answers, _version: "spiritual-gifts-v3-21", _questionOrder: spiritualGiftQuestions.map((question) => question.id) });
      window.localStorage.removeItem(storageKey);
      window.setTimeout(() => setStage("reveal"), 650);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
      setStage("questions");
    }
  };
  const restart = () => { setAnswers({}); setIndex(0); setStage("guide"); window.localStorage.removeItem(storageKey); };
  const landscape = (color = "green") => <div className={`${styles.landscape} ${styles[color]}`} aria-hidden="true" />;

  if (stage === "intro") return <main className={styles.shell}><div className={styles.frame}><p className={styles.eyebrow}>Ministry School ───</p><h1 className={styles.title}>Mes dons<br />spirituels.</h1><p className={styles.eyebrow}>Découvrir ce que Dieu a déposé en toi.</p><div className={styles.actions}><button className={styles.ghost} onClick={onBack}><ArrowLeft size={17} /> Retour</button><button className={styles.pill} onClick={() => setStage("guide")}>Commencer le test <ArrowRight size={19} /></button></div></div>{landscape()}</main>;

  if (stage === "guide") return <main className={styles.shell}><div className={styles.frame}><p className={styles.eyebrow}>Un parcours personnel</p><h1 className={`${styles.title} ${styles.titleSmall}`}>21 questions.<br />Un bilan.<br />Des défis.</h1><div className={styles.steps}><div className={styles.step}><b className={styles.stepNumber}>01</b><div><strong>Réponds simplement</strong><br /><span>selon la fréquence de tes expériences</span></div></div><div className={styles.step}><b className={styles.stepNumber}>02</b><div><strong>Découvre des signes</strong><br /><span>sans conclusion définitive</span></div></div><div className={styles.step}><b className={styles.stepNumber}>03</b><div><strong>Passe à l’action</strong><br /><span>avec un défi concret</span></div></div></div><p className={styles.notice}>Pour les questions « As-tu déjà », la note indique la fréquence de tes expériences, pas leur intensité.</p><div className={styles.actions}><button className={styles.ghost} onClick={() => setStage("intro")}><ArrowLeft size={17} /> Retour</button><button className={styles.pill} onClick={() => setStage("questions")}>C’est parti <ArrowRight size={19} /></button></div></div>{landscape("yellow")}</main>;

  if (stage === "questions") {
    const question = spiritualGiftQuestions[index];
    const selected = Number(answers[question.id]);
    const lastQuestion = index === spiritualGiftQuestions.length - 1;
    return <main className={styles.shell}><div className={styles.frame}><div className={styles.progress}><span>{index + 1} / {spiritualGiftQuestions.length}</span><span className={styles.bar}><span style={{ width: `${((index + 1) / spiritualGiftQuestions.length) * 100}%` }} /></span></div><h1 className={styles.question}>{question.text}</h1><div className={styles.scale} role="radiogroup" aria-label="Fréquence">{giftScaleLabels.map((label, value) => <button key={label} type="button" role="radio" aria-checked={selected === value} aria-label={`${value} — ${label}`} className={`${styles.choice} ${selected === value ? styles.choiceActive : ""}`} onClick={() => select(value)}><b>{value}</b><span>{label}</span></button>)}</div><p className={styles.hint}>Choisis la réponse qui correspond le mieux à ce que tu vis aujourd’hui. Il n’y a pas de bonne ou de mauvaise réponse.</p>{error && <p className={styles.notice}>{error}</p>}<div className={styles.actions}><button className={styles.ghost} onClick={() => index ? setIndex(index - 1) : setStage("guide")}><ArrowLeft size={17} /> Retour</button><button className={styles.round} disabled={!Number.isInteger(selected) || saving} onClick={nextQuestion} aria-label={lastQuestion ? "Voir mes résultats" : "Question suivante"}>{lastQuestion ? <Check size={20} /> : <ArrowRight size={20} />}</button></div></div>{landscape()}</main>;
  }

  if (stage === "analysis") return <main className={styles.shell}><div className={`${styles.frame} ${styles.analysis}`}><p className={styles.eyebrow}>Analyse</p><h1 className={styles.title}>Analyse<br />de tes<br />réponses…</h1><div className={styles.spinner} aria-label="Analyse en cours" /><p className={styles.analysisWord}>Bilan</p></div>{landscape("pink")}</main>;

  if (stage === "reveal") return <main className={styles.shell}><div className={`${styles.frame} ${styles.resultsIntro}`}><p className={styles.eyebrow}>Ton bilan personnel</p><h1 className={styles.title}>Bilan.<br />Voici tes résultats.</h1><p className={styles.lead}>Tes réponses mettent en lumière différents signes. Elles t’invitent à prier, à échanger et à servir avec humilité.</p><div className={styles.actions}><span /><button className={styles.pill} onClick={() => setStage("chapters")}>Voir mes résultats <ArrowRight size={19} /></button></div></div>{landscape()}</main>;

  if (stage === "chapters") return <main className={styles.shell}><div className={`${styles.frame} ${styles.resultsFrame}`}><p className={styles.eyebrow}>Voici tes résultats</p><h1 className={`${styles.title} ${styles.titleSmall}`}>Tes dons en trois chapitres.</h1><div className={styles.chapters}>{categories.map((category) => { const gifts = grouped[category.id] ?? []; return <button key={category.id} className={styles.chapter} onClick={() => { setCategoryId(category.id); setStage("category"); }}><span><b className={styles.categoryCount}>{gifts.length}</b><strong>{category.title}</strong><span>{gifts.length === 0 ? "Aucun don dans cette catégorie aujourd’hui" : `${gifts.length} don${gifts.length > 1 ? "s" : ""} à découvrir`}</span></span><ArrowRight size={19} /></button>; })}</div><p className={styles.notice}>Ce questionnaire ne confirme pas définitivement un don. Il t’aide à repérer ce que tu peux continuer à éprouver, développer et mettre au service des autres.</p><div className={styles.actions}><button className={styles.ghost} onClick={restart}><RotateCcw size={16} /> Refaire le test</button><button className={styles.pill} onClick={onBack}>Terminer <Check size={19} /></button></div></div>{landscape()}</main>;

  if (stage === "category") {
    const category = categories.find((item) => item.id === categoryId)!;
    const gifts = grouped[categoryId] ?? [];
    const guidance = categoryGuidance[categoryId];
    const categoryStyle = { "--category-accent": categoryAccents[categoryId] } as CSSProperties;
    return <main className={styles.shell}><div className={`${styles.frame} ${styles.categoryFrame}`} style={categoryStyle}><button className={styles.ghost} onClick={() => setStage("chapters")}><ArrowLeft size={17} /> Mes trois chapitres</button><header className={styles.categoryIntro}><p className={styles.eyebrow}>{gifts.length} don{gifts.length > 1 ? "s" : ""}</p><h1>{category.title}</h1><div className={styles.categoryOverview}><section><strong>Ce que cette catégorie signifie</strong><p>{guidance.meaning}</p></section><section><strong>Comment avancer</strong><p>{guidance.next}</p></section></div></header>{gifts.length ? <section className={styles.categoryGifts}>{gifts.map((gift) => { const giftCardStyle = { "--gift-card-accent": gift.palette.background } as CSSProperties; return <button className={styles.categoryGift} style={giftCardStyle} key={gift.id} onClick={() => { setGiftIndex(results.findIndex((item) => item.id === gift.id)); setStage("gift"); }}><div className={styles.categoryGiftHeading}><span>{categoryId === "exercised" ? "Reconnu" : categoryId === "developing" ? "À développer" : "À explorer"}</span><h2>{gift.name}</h2></div><p>Découvrir ton interprétation et ton défi</p><ArrowRight className={styles.giftOpen} size={19} /></button>; })}</section> : <div className={styles.emptyCategory}><h2>Aucun don dans cette catégorie aujourd’hui</h2><p>Ce résultat n’est ni un manque ni une conclusion définitive. Reviens aux autres chapitres pour découvrir les dons qui ressortent davantage.</p></div>}<div className={styles.actions}><button className={styles.ghost} onClick={() => setStage("chapters")}><ArrowLeft size={17} /> Retour aux résultats</button><button className={styles.pill} onClick={onBack}>Terminer <Check size={19} /></button></div></div></main>;
  }

  if (stage === "gift") {
    const gift = results[giftIndex];
    const category = categories.find((item) => item.id === gift.category)!;
    const giftStyle = { "--gift-accent": gift.palette.background } as CSSProperties;
    return <main className={`${styles.shell} ${styles.giftPage}`} style={giftStyle}><div className={styles.frame}><p className={styles.eyebrow}>{category.title}</p><header className={styles.giftHeader}><h1 className={styles.giftTitle}>{gift.name}</h1><p className={styles.lead}>{gift.definition}</p></header><div className={styles.giftCard}><strong>Ce que tes réponses laissent apparaître</strong><p>{gift.interpretation}</p></div><div className={styles.giftCard}><strong>Ton défi</strong><p>{gift.challenge}</p></div><div className={styles.actions}><button className={styles.ghost} onClick={() => setStage("category")}><ArrowLeft size={17} /> Retour au chapitre</button><button className={styles.pill} onClick={onBack}>Terminer <Check size={19} /></button></div></div><div className={styles.giftLandscape} aria-hidden="true" /></main>;
  }

  return <main className={styles.shell}><div className={`${styles.frame} ${styles.summary}`}><p className={styles.eyebrow}>Ton bilan personnalisé</p><h1 className={`${styles.title} ${styles.titleSmall}`}>Mets ces dons<br />au service<br />des autres.</h1>{categories.map((category) => { const gifts = grouped[category.id] ?? []; return <section key={category.id}><h2>{category.title}</h2><p>{category.copy} {category.id === "less_visible" && grouped.exercised?.length ? `Concentre-toi d’abord sur ${grouped.exercised.map((gift) => gift.name).join(" et ")}, qui ressort${grouped.exercised.length > 1 ? "ent" : ""} davantage.` : ""}</p>{gifts.map((gift) => <div key={gift.id}><h3>{gift.name}</h3><p>{gift.challenge}</p></div>)}</section>; })}<p className={styles.notice}>Dieu confie des dons pour édifier son Église, aider les autres et révéler sa gloire, jamais pour la gloire personnelle. Continue de prier, d’apprendre et de les exercer avec humilité.</p><div className={styles.actions}><button className={styles.ghost} onClick={() => setStage("chapters")}><ArrowLeft size={17} /> Revoir mon bilan</button><button className={styles.pill} onClick={onBack}>Terminer <Check size={19} /></button></div></div>{landscape()}</main>;
}
