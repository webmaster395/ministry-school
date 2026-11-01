"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
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
      <header className={styles.header}>
        <div className={styles.headerBrand} aria-label="Ministry School, MLK Formation">
          <Image className={styles.ministryMarks} src="/landing/ministry-icons-transparent.png" alt="" width={126} height={42} priority />
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.formation}>MLK FORMATION</span>
        </div>
        <a className={styles.loginLink} href="/login">Se connecter</a>
      </header>

      <section className={styles.content} aria-labelledby="apps-title">
        <header className={styles.intro}>
          <p className={styles.eyebrow}>VOS APPS MINISTRY SCHOOL</p>
          <h1 id="apps-title">Mes applications.</h1>
          <p className={styles.subtitle}>Conçues pour vous aider à aller plus loin.</p>
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
              <span className={styles.appName}>{app.name}<ArrowUpRight size={13} aria-hidden="true" /></span>
            </a>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <a href="/mentions-legales">Mentions légales</a><span aria-hidden="true">|</span><a href="/mentions-legales#donnees-personnelles">Politique de confidentialité</a>
      </footer>
    </main>
  );
}
