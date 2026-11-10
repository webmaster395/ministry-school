"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./preview.module.css";

type Screen = "all" | "intro" | "events" | "timeline" | "reflection" | "final";

export type LifeEvent = {
  id: string;
  year: number;
  title: string;
  story: string;
  lesson: string;
  verse?: string;
  complete: boolean;
};

type ReflectionAnswers = Record<string, string>;
const emptyEvent = (): LifeEvent => ({ id: `draft-${Date.now()}`, year: new Date().getFullYear(), title: "", story: "", lesson: "", verse: "", complete: false });

const sampleEvents: LifeEvent[] = [
  { id: "e1", year: 2012, title: "Ma rencontre avec Dieu", story: "J’ai commencé à comprendre que la foi pouvait devenir une relation personnelle.", lesson: "J’ai découvert que je pouvais m’approcher de Dieu avec simplicité.", verse: "Jérémie 29:13", complete: true },
  { id: "e2", year: 2015, title: "Une parole qui m’a marqué", story: "Une personne m’a encouragé à ne pas minimiser ce que je pouvais apporter aux autres.", lesson: "Certaines paroles prennent tout leur sens avec le temps.", complete: true },
  { id: "e3", year: 2018, title: "Mon premier engagement", story: "J’ai rejoint une équipe pour aider à accueillir les nouveaux arrivants.", lesson: "Servir m’a appris à regarder davantage les besoins autour de moi.", verse: "1 Pierre 4:10", complete: true },
  { id: "e4", year: 2020, title: "Une période difficile", story: "Cette saison a remis en question plusieurs certitudes et m’a obligé à ralentir.", lesson: "Je ne comprends pas encore tout, mais j’ai appris à ne pas traverser seul les moments difficiles.", complete: true },
  { id: "e5", year: 2023, title: "Une rencontre déterminante", story: "Une conversation m’a aidé à mieux nommer ce qui me touche profondément.", lesson: "L’accompagnement d’une personne mature peut ouvrir de nouvelles pistes.", complete: true },
  { id: "e6", year: 2026, title: "Une nouvelle étape de service", story: "J’ai accepté de découvrir une responsabilité que je n’avais jamais exercée.", lesson: "Je peux explorer sans devoir tout savoir dès le départ.", complete: true },
];

const nav: Array<{ key: Screen; label: string }> = [
  { key: "all", label: "Tous les écrans" },
  { key: "intro", label: "Introduction" },
  { key: "events", label: "Saisie" },
  { key: "timeline", label: "Frise · 6 événements" },
  { key: "reflection", label: "Réflexion" },
  { key: "final", label: "Résultat final" },
];

export default function LifeLinePreviewPage({ production = false }: { production?: boolean }) {
  const [screen, setScreen] = useState<Screen>(production ? "intro" : "all");
  const [events, setEvents] = useState<LifeEvent[]>(production ? [] : sampleEvents);
  const [reflection, setReflection] = useState<ReflectionAnswers>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = events.find((event) => event.id === selectedId) ?? null;
  const completeEvents = useMemo(() => events.filter((event) => event.complete).sort((a, b) => b.year - a.year || b.id.localeCompare(a.id)), [events]);

  useEffect(() => {
    if (!production) return;
    void fetch("/api/apps/life-line").then((response) => response.ok ? response.json() : null).then((payload) => {
      if (!payload?.journey) return;
      if (Array.isArray(payload.journey.events)) setEvents(payload.journey.events);
      if (payload.journey.reflection && typeof payload.journey.reflection === "object") setReflection(payload.journey.reflection);
      if (payload.journey.completed_at) setScreen("final");
    }).catch(() => undefined);
  }, [production]);

  const persist = async (nextEvents = events, nextReflection = reflection, completed = false) => {
    if (!production) return;
    await fetch("/api/apps/life-line", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: nextEvents, reflection: nextReflection, completed }) });
  };

  return <main className={styles.shell}>
    {screen === "all" && <div className={styles.showcase}>
      <Intro onContinue={() => setScreen("events")} />
      <Events events={events} setEvents={setEvents} onSave={(next) => persist(next)} onContinue={() => setScreen("timeline")} />
      <Timeline events={completeEvents} onOpen={setSelectedId} onContinue={() => setScreen("reflection")} />
      <Reflection values={reflection} onChange={setReflection} onContinue={() => setScreen("final")} />
      <Final events={completeEvents} onOpen={setSelectedId} onEdit={() => setScreen("events")} />
    </div>}
    {screen === "intro" && <Intro onContinue={() => setScreen("events")} />}
    {screen === "events" && <Events events={events} setEvents={setEvents} onSave={(next) => persist(next)} onContinue={() => setScreen("timeline")} />}
    {screen === "timeline" && <Timeline events={completeEvents} onOpen={setSelectedId} onContinue={() => setScreen("reflection")} />}
    {screen === "reflection" && <Reflection values={reflection} onChange={setReflection} onContinue={() => { void persist(events, reflection, true); setScreen("final"); }} />}
    {screen === "final" && <Final events={completeEvents} onOpen={setSelectedId} onEdit={() => setScreen("events")} />}

    {selected && <EventDialog event={selected} onClose={() => setSelectedId(null)} />}

    {!production && <aside className={styles.previewNav} aria-label="Écrans de prévisualisation">
      {nav.map((item) => <button key={item.key} type="button" className={screen === item.key ? styles.previewActive : ""} onClick={() => setScreen(item.key)}>{item.label}</button>)}
    </aside>}
  </main>;
}

function Header({ step, onBack }: { step: string; onBack?: () => void }) {
  return <header className={styles.header}>
    {onBack ? <button type="button" className={styles.textButton} onClick={onBack}>← Retour</button> : <span className={styles.brand}>MINISTRY SCHOOL</span>}
    <span>{step}</span>
  </header>;
}

function Intro({ onContinue }: { onContinue: () => void }) {
  return <section className={`${styles.screen} ${styles.cover}`}>
    <Header step="JE DÉCOUVRE MON APPEL" />
    <div className={styles.coverCopy}>
      <p className={styles.eyebrow}>ATELIER PERSONNEL</p>
      <h1>Ma ligne de vie.</h1>
      <h2>Et si ton histoire t’aidait à mieux comprendre ton appel&nbsp;?</h2>
      <p>Certains événements de ta vie ont peut-être joué un rôle important dans ton cheminement avec Dieu. Revisite ton histoire, reconnais ce que tu as vécu et découvre les éléments qui reviennent dans ton parcours.</p>
      <p className={styles.reassurance}>Il n’y a pas de bonne ou de mauvaise histoire. Tu restes libre de ne pas raconter certains épisodes personnels.</p>
    </div>
    <footer className={styles.screenFooter}><span>Privé · modifiable · à ton rythme</span><button className={styles.primary} onClick={onContinue}>Commencer ma ligne de vie <b>→</b></button></footer>
  </section>;
}

function Events({ events, setEvents, onSave, onContinue }: { events: LifeEvent[]; setEvents: (events: LifeEvent[]) => void; onSave: (events: LifeEvent[]) => void; onContinue: () => void }) {
  const [editing, setEditing] = useState(events[events.length - 1] ?? emptyEvent());
  const update = (key: keyof LifeEvent, value: string | number) => setEditing((current) => ({ ...current, [key]: value }));
  const save = () => {
    const next = { ...editing, complete: Boolean(editing.year && editing.title.trim() && editing.story.trim() && editing.lesson.trim()) };
    const updated = events.some((event) => event.id === next.id) ? events.map((event) => event.id === next.id ? next : event) : [...events, next];
    setEvents(updated);
    onSave(updated);
  };
  return <section className={`${styles.screen} ${styles.eventsScreen}`}>
    <Header step="ÉTAPE 1 SUR 3 · MES ÉVÉNEMENTS" />
    <div className={styles.editorLayout}>
      <div className={styles.editorIntro}><p className={styles.eyebrow}>CONSTRUIRE MON HISTOIRE</p><h1>Ajoute les moments qui comptent.</h1><p>Commence avec cinq ou six événements. Tu pourras toujours revenir, modifier ton récit ou enrichir ta ligne de vie.</p>
        <div className={styles.eventPicker}>
          <label><span>Événement à modifier</span><select value={editing.id} onChange={(event) => { const selected = events.find((item) => item.id === event.target.value); if (selected) setEditing(selected); }}>{events.map((event) => <option key={event.id} value={event.id}>{event.year} — {event.title}</option>)}</select></label>
          <button type="button" onClick={() => setEditing(emptyEvent())}>＋ Ajouter un événement</button>
        </div>
        <div className={styles.eventRail}>{events.map((event) => <button type="button" key={event.id} className={editing.id === event.id ? styles.railActive : ""} onClick={() => setEditing(event)}><span>{event.year}</span><b>{event.title}</b><i>{event.complete ? "Complet" : "Brouillon"}</i></button>)}
          <button type="button" onClick={() => setEditing(emptyEvent())}><span>＋</span><b>Ajouter un événement</b><i>Brouillon autorisé</i></button>
        </div>
      </div>
      <form className={styles.form} onSubmit={(event) => { event.preventDefault(); save(); }}>
        <label className={styles.yearField}><span>Année</span><input type="number" min="1" max={new Date().getFullYear()} value={editing.year} onChange={(event) => update("year", Number(event.target.value))} /></label>
        <label><span>Comment appellerais-tu ce moment de ta vie&nbsp;?</span><input value={editing.title} onChange={(event) => update("title", event.target.value)} placeholder="Une rencontre déterminante" /></label>
        <label><span>Que s’est-il passé&nbsp;?</span><small>Raconte ce moment avec tes mots. Pourquoi est-il important dans ton histoire&nbsp;?</small><textarea value={editing.story} onChange={(event) => update("story", event.target.value)} rows={4} /></label>
        <label><span>Qu’est-ce que cet événement t’a appris&nbsp;?</span><small>Tu peux aussi indiquer que tu ne comprends pas encore pleinement ce que tu as vécu.</small><textarea value={editing.lesson} onChange={(event) => update("lesson", event.target.value)} rows={4} /></label>
        <label><span>Un verset biblique accompagne-t-il ce moment&nbsp;? <em>Facultatif</em></span><input value={editing.verse ?? ""} onChange={(event) => update("verse", event.target.value)} placeholder="Ésaïe 41:10 ou le texte du verset" /></label>
        <div className={styles.formActions}><button type="button" className={styles.secondary} onClick={save}>Enregistrer le brouillon</button><button type="button" className={styles.primary} onClick={() => { save(); onContinue(); }}>Voir ma ligne de vie <b>→</b></button></div>
      </form>
    </div>
  </section>;
}

function Timeline({ events, onOpen, onContinue }: { events: LifeEvent[]; onOpen: (id: string) => void; onContinue: () => void }) {
  return <section className={`${styles.screen} ${styles.timelineScreen}`}>
    <Header step="ÉTAPE 2 SUR 3 · MON HISTOIRE" />
    <div className={styles.timelineHeading}><p className={styles.eyebrow}>DU PLUS ANCIEN AU PLUS RÉCENT</p><h1>Le chemin que<br />j’ai parcouru.</h1><p>Commence en bas, dans tes racines, puis remonte jusqu’à aujourd’hui.</p></div>
    <div className={styles.timeline}>
      <div className={styles.calling}><h2>Mon appel à discerner</h2><p>À la lumière de mon histoire, qu’est-ce que je découvre de mon appel&nbsp;?</p></div>
      {events.map((event, index) => <button type="button" key={event.id} className={styles.timelineEvent} onClick={() => onOpen(event.id)} style={{ "--event-index": index } as CSSProperties}>
        <span className={styles.dot} />
        <span className={styles.eventCard}><b>{event.year}</b><strong>{event.title}</strong><small>{event.lesson}</small></span>
      </button>)}
      <div className={styles.roots}><span>MES RACINES</span><p>Les premières expériences et les événements fondateurs.</p></div>
    </div>
    <footer className={styles.screenFooter}><button className={styles.secondary}>＋ Ajouter un événement</button><button className={styles.primary} onClick={onContinue}>Prendre du recul <b>→</b></button></footer>
  </section>;
}

function Reflection({ values, onChange, onContinue }: { values: ReflectionAnswers; onChange: (values: ReflectionAnswers) => void; onContinue: () => void }) {
  const questions = [
    ["Qu’est-ce qui revient régulièrement dans mon histoire ?", "Des thèmes, des rencontres, des besoins qui te touchent, des expériences ou des désirs récurrents."],
    ["Qu’est-ce que ces expériences m’ont appris ?", "Sur Dieu, sur toi-même, sur les autres et sur ce qui compte pour toi."],
    ["Quelle direction est-ce que je souhaite explorer dans la prière ?", "Une intuition, un domaine de service, une cause ou une manière d’aider les autres."],
    ["Quel premier pas concret pourrais-je faire ?", "Une personne à rencontrer, un service à découvrir ou une discussion à avoir."],
  ];
  return <section className={`${styles.screen} ${styles.reflectionScreen}`}>
    <Header step="ÉTAPE 3 SUR 3 · DISCERNER MON APPEL" />
    <div className={styles.reflectionIntro}><p className={styles.eyebrow}>PRENDRE DU RECUL</p><h1>Ce que mon histoire<br />me révèle.</h1><p>Ces éléments ne définissent pas automatiquement ton appel, mais ils peuvent t’aider à discerner une direction.</p></div>
    <div className={styles.reflectionGrid}>{questions.map(([question, help], index) => <label key={question}><b>{String(index + 1).padStart(2, "0")}</b><strong>{question}</strong><span>{help}</span><textarea rows={4} placeholder="Écris librement…" value={values[String(index)] ?? ""} onChange={(event) => onChange({ ...values, [String(index)]: event.target.value })} /></label>)}</div>
    <footer className={styles.screenFooter}><span>Tes réponses restent privées.</span><button className={styles.primary} onClick={onContinue}>Enregistrer ma réflexion <b>→</b></button></footer>
  </section>;
}

function Final({ events, onOpen, onEdit }: { events: LifeEvent[]; onOpen: (id: string) => void; onEdit: () => void }) {
  return <section className={`${styles.screen} ${styles.finalScreen}`}>
    <Header step="MON ESPACE PERSONNEL" />
    <div className={styles.finalHero}><p className={styles.eyebrow}>MA LIGNE DE VIE</p><h1>Je vois mieux<br />le chemin parcouru.</h1><p>{events.length} moments composent aujourd’hui ton histoire. Tu peux continuer à l’enrichir à mesure que ton parcours avance.</p></div>
    <div className={styles.finalGrid}>
      <article className={styles.miniTimeline}><p className={styles.eyebrow}>MON HISTOIRE</p>{events.slice(0, 4).map((event) => <button key={event.id} onClick={() => onOpen(event.id)}><b>{event.year}</b><span>{event.title}</span></button>)}<small>+ {Math.max(0, events.length - 4)} autre{events.length - 4 > 1 ? "s" : ""} événement{events.length - 4 > 1 ? "s" : ""}</small></article>
      <article className={styles.insight}><p className={styles.eyebrow}>CE QUE JE RETIENS</p><h2>Des thèmes commencent à se dessiner.</h2><p>Je remarque que les rencontres, le service et l’accompagnement reviennent souvent dans mon histoire.</p><button>Relire ma réflexion →</button></article>
      <article className={styles.nextStep}><p className={styles.eyebrow}>MON PROCHAIN PAS</p><h2>Rencontrer une personne qui peut m’accompagner.</h2><p>Préparer mes questions et demander un temps d’échange avant la fin du mois.</p></article>
    </div>
    <footer className={styles.screenFooter}><button className={styles.secondary} onClick={onEdit}>Modifier mon histoire</button><button className={styles.primary}>Imprimer ma ligne de vie <b>↗</b></button></footer>
  </section>;
}

function EventDialog({ event, onClose }: { event: LifeEvent; onClose: () => void }) {
  return <div className={styles.dialogBackdrop} role="presentation" onMouseDown={onClose}><article role="dialog" aria-modal="true" aria-label={event.title} className={styles.dialog} onMouseDown={(click) => click.stopPropagation()}><button className={styles.close} onClick={onClose} aria-label="Fermer">×</button><p className={styles.eyebrow}>{event.year} · MON HISTOIRE</p><h2>{event.title}</h2><h3>Ce que j’ai vécu</h3><p>{event.story}</p><h3>Ce que j’en retiens</h3><p>{event.lesson}</p>{event.verse && <blockquote>{event.verse}</blockquote>}<button className={styles.secondary}>Modifier cet événement</button></article></div>;
}
