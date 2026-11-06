import Image from "next/image";
import styles from "./preview.module.css";
import { withMappAssetPath } from "@/lib/routing/base-path";

export function PeopleReminder() {
  return <section className={styles.peopleReminder} aria-labelledby="organisation-people-reminder-title">
    <div className={styles.peopleReminderVisual}>
      <Image
        src={withMappAssetPath("/images/organisation/role-overview-natural.jpg")}
        alt="Un membre d’équipe souriant dans les locaux de MLK"
        fill
        sizes="(max-width: 760px) 100vw, 42vw"
      />
    </div>
    <div className={styles.peopleReminderCopy}>
      <h2 id="organisation-people-reminder-title">Au-delà des profils, aimer les personnes</h2>
      <p>Que tu sois dans une entreprise, une association, une église ou toute autre organisation, chaque personne mérite d'être écoutée, comprise et respectée.</p>
      <p>Un profil comportemental peut t'aider à mieux communiquer, mais il ne définit jamais entièrement une personne. Avant de chercher à convaincre, motiver ou résoudre une difficulté, prends le temps de comprendre ce qu'elle vit, ce qui compte pour elle et ce dont elle a besoin.</p>
      <blockquote>« Tu aimeras ton prochain comme toi-même. » <cite>- Matthieu 22.39</cite></blockquote>
      <p>Et si, avant ton prochain échange, tu demandais à Dieu la sagesse de voir cette personne comme Il la voit, de mieux la comprendre et de trouver les mots et l'attitude justes ?</p>
    </div>
  </section>;
}
