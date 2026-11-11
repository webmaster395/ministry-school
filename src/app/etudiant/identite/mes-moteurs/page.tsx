import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import { getViewer } from "@/lib/data/viewer";
import { getPublishedHeroesMotorsResult, type HeroesMotorsResult } from "@/lib/identity/heroes-motors";
import styles from "./prototype.module.css";

export const dynamic = "force-dynamic";

export function HeroesMotorsResultView({ result, preview = false }: { result: HeroesMotorsResult; preview?: boolean }) {
  const paragraphs = result.portrait.split(/\n\s*\n/).filter(Boolean);

  return <article className={styles.page}>
    <nav className={styles.topbar} aria-label="Retour"><BackButton fallbackHref="/etudiant/identite" fallbackLabel="Mon identité" />{preview ? <span>Aperçu administrateur</span> : null}</nav>
    <section className={styles.portrait} aria-labelledby="portrait-title">
      <header><p>01 — Mon portrait</p><h1 id="portrait-title">Ce qui me <em>définit.</em></h1></header>
      <div className={styles.portraitText}>{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
    </section>
    <section className={styles.motors} aria-labelledby="motors-title">
      <header><p>02 — Mes moteurs</p><h2 id="motors-title">Ce qui me <em>fait avancer.</em></h2><span>Les valeurs qui donnent du sens à mes choix.</span></header>
      <ol>{result.motors.map((motor, index) => <li key={motor}><b>{String(index + 1).padStart(2, "0")}.</b>{motor}</li>)}</ol>
    </section>
    <section className={styles.heroes} aria-labelledby="heroes-title">
      <header><p>03 — Mes héros</p><h2 id="heroes-title">Mes trois inspirations.</h2></header>
      <ul>{result.heroes.map((hero) => <li key={hero}>{hero}</li>)}</ul>
    </section>
  </article>;
}

export default async function HeroesMotorsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/etudiant/identite/mes-moteurs");
  const published = await getPublishedHeroesMotorsResult(viewer.id);
  if (!published) redirect("/etudiant/identite");
  return <HeroesMotorsResultView result={published} />;
}
