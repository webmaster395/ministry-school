"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./apps.module.css";
import type { CatalogApp } from "@/lib/apps/catalog";

function AppIcon({ app }: { app: CatalogApp }) {
  if (app.iconUrl) {
    return (
      <span className={`${styles.appIcon} ${app.slug === "generopoly" ? styles.generopolyIcon : styles.generosityIcon}`}>
        {app.iconUrl.startsWith("/") ? (
          <Image src={app.iconUrl} alt="" width={app.slug === "generopoly" ? 90 : 56} height={app.slug === "generopoly" ? 90 : 56} priority />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- URL gérée par les super administrateurs du catalogue
          <img src={app.iconUrl} alt="" />
        )}
      </span>
    );
  }
  return (
    <span className={`${styles.appIcon} ${styles.mappIcon}`} aria-label={`${app.name}, application ${app.category}`}>
      {app.name.slice(0, 4).toUpperCase().split("").map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}
    </span>
  );
}

export default function AppsPortal({ applications }: { applications: CatalogApp[] }) {
  const filters = useMemo(() => ["Tout", ...Array.from(new Set(applications.map((app) => app.category)))], [applications]);
  const [activeFilter, setActiveFilter] = useState("Tout");
  const visibleApps = useMemo(
    () => applications
      .filter((app) => activeFilter === "Tout" || app.category === activeFilter)
      .sort((a, b) => a.order - b.order),
    [activeFilter, applications]
  );

  return (
    <main className={styles.portal}>
      <header className={styles.header}>
        <a className={styles.headerBrand} href="/" aria-label="Ministry School — accueil">
          <Image className={styles.ministryMarks} src="/landing/ministry-icons-transparent.png" alt="" width={116} height={38} priority />
          <span className={styles.brandCopy}>
            <span className={styles.brandName}>Ministry School</span>
            <span className={styles.formation}>MLK FORMATION</span>
          </span>
        </a>
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
            <a className={styles.appLink} href={app.url} key={app.id}>
              <AppIcon app={app} />
              <span className={styles.appName}>{app.name}</span>
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
