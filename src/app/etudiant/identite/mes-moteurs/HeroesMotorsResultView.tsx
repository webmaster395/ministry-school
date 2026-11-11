import BackButton from "@/components/BackButton";
import type { HeroesMotorsResult } from "@/lib/identity/heroes-motors";
import styles from "./prototype.module.css";

function portraitParagraphs(value: string) {
  return value.replace(/&nbsp;/gi, " ").replace(/<br\s*\/?\s*>/gi, "\n").split(/\n\s*\n+/).map((paragraph) => paragraph.replace(/\n+/g, " ").trim()).filter(Boolean);
}

export default function HeroesMotorsResultView({ result, preview = false, embedded = false }: { result: HeroesMotorsResult; preview?: boolean; embedded?: boolean }) {
  const paragraphs = result.portrait ? portraitParagraphs(result.portrait) : [];
  return <article className={styles.page}>
    {!embedded ? <nav className={styles.topbar} aria-label="Retour"><BackButton fallbackHref="/etudiant/identite" fallbackLabel="Mon identité" />{preview ? <span>Aperçu administrateur</span> : null}</nav> : null}
    <header className={styles.hero}><p>TEST DES HÉROS</p><h1>Ce qui m&apos;anime</h1><span>Les qualités qui m&apos;inspirent, les forces qui me caractérisent et les personnes qui me donnent envie d&apos;aller plus loin.</span></header>
    {result.communicationStatus === "refused" ? <section className={styles.confidential} aria-labelledby="confidential-title">
      <p>TEST DES HÉROS</p><h2 id="confidential-title">Une réflexion qui t&apos;appartient</h2>
      <div><p>Tu as choisi de garder tes réponses au Test des héros confidentielles, et ce choix est pleinement respecté. Ce test est avant tout une invitation à mieux te connaître, à identifier les qualités qui t&apos;inspirent et à réfléchir à ce qui te pousse à avancer. Même si ton portrait n&apos;est pas affiché ici, tes réflexions personnelles conservent toute leur valeur.</p><p>Les personnes qui nous inspirent révèlent souvent quelque chose de nos aspirations profondes, de nos convictions et de la personne que nous désirons devenir. Continue à explorer ces qualités, à reconnaître les forces que Dieu a placées en toi et à les développer au quotidien.</p><p>Ton identité ne se résume pas à un test. Elle se découvre, se construit et grandit tout au long de ta vie, par la grâce de Dieu.</p></div>
    </section> : <>
      <section className={styles.portrait} aria-labelledby="portrait-title"><h2 id="portrait-title">Mon portrait</h2><div className={styles.portraitText}>{paragraphs.map((paragraph, index) => <p className={index === 0 ? styles.opening : undefined} key={`${index}-${paragraph.slice(0, 30)}`}>{paragraph}</p>)}</div></section>
      <section className={styles.motors} aria-labelledby="motors-title"><h2 id="motors-title">Mes moteurs</h2><ul>{result.motors.map((motor, index) => <li key={`${index}-${motor}`}>{motor}</li>)}</ul></section>
      <section className={styles.heroes} aria-labelledby="heroes-title"><h2 id="heroes-title">Mes héros</h2><ol>{result.heroes.map((hero, index) => <li key={`${index}-${hero}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{hero}</span></li>)}</ol></section>
    </>}
    <footer className={styles.footer}><BackButton fallbackHref="/etudiant/identite" fallbackLabel="Mon identité" /></footer>
  </article>;
}
