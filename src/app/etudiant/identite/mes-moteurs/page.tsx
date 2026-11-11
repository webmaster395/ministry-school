import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getViewer } from "@/lib/data/viewer";
import { getPublishedHeroesMotorsResult, type HeroesMotorsResult } from "@/lib/identity/heroes-motors";
import styles from "./prototype.module.css";

export const dynamic = "force-dynamic";

export const leilaPreview: HeroesMotorsResult = {
  firstName: "Leïla",
  publishedAt: "2026-11-10T00:00:00.000Z",
  portrait: `Leïla est courageuse, dévouée et profondément attachée à ses convictions. Elle est animée par un sens du devoir et une capacité d’abnégation qui donnent une place importante à l’engagement et au don de soi.

Elle sait d’où elle vient. Son identité, ses racines et son histoire familiale occupent une place essentielle dans ce qui la définit. Elle accorde une grande valeur à la connaissance de son histoire, au respect de son héritage et à sa transmission. Ce qui est particulièrement important pour elle, c’est que ce respect n’exige pas d’être d’accord avec tout. Elle peut honorer ce qui lui a été transmis tout en restant fidèle à ses propres convictions.

Leïla est aussi déterminée. Elle a un sens de la direction, des objectifs auxquels elle tient et une volonté de les poursuivre sans en dévier. Sa fidélité à ses convictions et à son identité est sans compromis. Elle accorde de l’importance à la cohérence entre ce qu’elle est, ce qu’elle croit et la direction qu’elle choisit.

Leïla est également une femme de foi. Une foi communicante, qui ne reste pas seulement intérieure, mais qui se partage. Cette foi s’accompagne d’une espérance qui va au-delà du visible, une espérance qui ne se limite pas à ce qui peut être constaté ou compris aujourd’hui.

Enfin, la famille et l’amour occupent une place importante pour Leïla. Elle porte cette valeur d’un amour sacrificiel, d’un amour marqué par le dévouement et l’abnégation.

Leïla est une personne de courage et de foi, enracinée dans son identité, fidèle à ses convictions, déterminée dans ses objectifs et profondément attachée à l’amour et à la transmission.`,
  motors: ["Le courage et le sens du devoir", "L’ancrage identitaire et la transmission", "La fidélité aux convictions et la détermination", "L’amour sacrificiel", "La foi communicante", "L’espérance au-delà du visible"],
  heroes: ["Ma mère", "Black Panther", "Mireille — mon témoin"],
};

export function HeroesMotorsResultView({ result, preview = false }: { result: HeroesMotorsResult; preview?: boolean }) {
  const paragraphs = result.portrait.split(/\n\s*\n/).filter(Boolean);

  return <article className={styles.page}>
    <nav className={styles.topbar} aria-label="Retour"><Link href="/etudiant/identite"><ArrowLeft /> Mon identité</Link>{preview ? <span>Aperçu administrateur</span> : null}</nav>
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
  const result = published ?? (viewer.roles.superAdmin ? leilaPreview : null);

  if (!result) return <main className={styles.unavailable}><Link href="/etudiant/identite"><ArrowLeft /> Mon identité</Link><div><p>Mes héros, mes moteurs</p><h1>Ton résultat n’est pas encore disponible.</h1></div></main>;
  return <HeroesMotorsResultView result={result} preview={!published} />;
}
