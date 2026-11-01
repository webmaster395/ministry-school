"use client";

import Image from "next/image";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./apps.module.css";

type Category = "Tout" | "Finance" | "Identité";

type MinistryApp = {
  id: string;
  name: string;
  description: string;
  category: Exclude<Category, "Tout">;
  url: string;
  published: boolean;
  order: number;
  icon: "generosity" | "generopoly" | "mapp";
};

// Ajouter une application revient à compléter cette liste : les filtres et la grille se mettent à jour seuls.
const applications: MinistryApp[] = [
  {
    id: "ma-generosite",
    name: "Ma générosité",
    description: "Explorez votre rapport à l'argent et au don.",
    category: "Finance",
    url: "https://generosite.jeveuxdonner.fr/",
    published: true,
    order: 1,
    icon: "generosity",
  },
  {
    id: "generopoly",
    name: "Généropoly",
    description: "Le jeu où chaque choix compte.",
    category: "Finance",
    url: "https://ma-generosite.vercel.app/",
    published: true,
    order: 2,
    icon: "generopoly",
  },
  {
    id: "profil-mapp",
    name: "Profil MAPP",
    description: "Découvrez votre profil et votre manière de fonctionner.",
    category: "Identité",
    url: "https://profil-mapp.vercel.app/",
    published: true,
    order: 3,
    icon: "mapp",
  },
];

const filters: Category[] = ["Tout", "Finance", "Identité"];

function AppIcon({ icon, name }: Pick<MinistryApp, "icon" | "name">) {
  if (icon === "generosity") {
    return (
      <span className={`${styles.appIcon} ${styles.generosityIcon}`}>
        <Image src="/apps/ma-generosite.png" alt="" width={72} height={72} priority />
      </span>
    );
  }

  if (icon === "generopoly") {
    return (
      <span className={`${styles.appIcon} ${styles.generopolyIcon}`}>
        <Image src="/apps/generopoly.png" alt="" width={132} height={132} priority />
      </span>
    );
  }

  return (
    <span className={`${styles.appIcon} ${styles.mappIcon}`} aria-label={`${name}, application identité`}>
      <span>M</span><span>A</span><span>P</span><span>P</span>
    </span>
  );
}

export default function AppsPortal() {
  const [activeFilter, setActiveFilter] = useState<Category>("Tout");
  const visibleApps = useMemo(
    () => applications
      .filter((app) => app.published && (activeFilter === "Tout" || app.category === activeFilter))
      .sort((a, b) => a.order - b.order),
    [activeFilter]
  );

  return (
    <main className={styles.portal}>
      <div className={styles.orbOne} aria-hidden="true" />
      <div className={styles.orbTwo} aria-hidden="true" />
      <div className={styles.orbThree} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <section className={styles.content} aria-labelledby="apps-title">
        <header className={styles.intro}>
          <p className={styles.eyebrow}><Sparkles size={15} strokeWidth={1.8} /> MINISTRY SCHOOL</p>
          <h1 id="apps-title">Des outils pour aller plus loin.</h1>
          <p className={styles.subtitle}>Des outils conçus pour vous.</p>
        </header>

        <nav className={styles.filters} aria-label="Filtrer les applications">
          {filters.map((filter) => (
            <button
              className={`${styles.filter} ${activeFilter === filter ? styles.filterActive : ""}`}
              type="button"
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
              key={filter}
            >
              {filter}
            </button>
          ))}
        </nav>

        <div className={styles.appGrid} aria-live="polite">
          {visibleApps.map((app) => (
            <a className={styles.appLink} href={app.url} key={app.id} target="_blank" rel="noreferrer">
              <AppIcon icon={app.icon} name={app.name} />
              <span className={styles.appName}>{app.name}<ArrowUpRight size={15} aria-hidden="true" /></span>
              <span className={styles.appDescription}>{app.description}</span>
              <span className={styles.appCategory}>{app.category}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>Ministry School · Des outils au service de votre parcours</footer>
    </main>
  );
}
