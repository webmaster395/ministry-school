"use client";

/* eslint-disable @next/next/no-img-element -- avatars et icônes administrables */
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Grid3X3,
  Network,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { IdentityResult } from "@/lib/identity/dashboard";
import styles from "./identity.module.css";

export type IdentityStoryItem = { key: string; name: string; href: string; iconUrl: string | null };
export type IdentityStoryGroup = { key: "identity" | "finance" | "recommendations"; label: string; image: string; items: IdentityStoryItem[] };
export type IdentityUpcomingItem = IdentityStoryItem & { category: string };

type Props = {
  fullName: string;
  status: string;
  avatarUrl: string | null;
  studentCount: number;
  months: number;
  completedTests: number;
  stories: IdentityStoryGroup[];
  results: IdentityResult[];
  upcoming: IdentityUpcomingItem[];
};

const profileNames: Record<string, string> = {
  D: "Conquérant",
  I: "Communiquant",
  S: "Facilitateur",
  C: "Analyste",
  conquerant: "Conquérant",
  communiquant: "Communiquant",
  facilitateur: "Facilitateur",
  analyste: "Analyste",
};

const mappImages: Record<string, string> = {
  D: "/apps/profil-mapp/images/profile-cards/paul-hero-hd-v2.webp",
  I: "/apps/profil-mapp/images/profile-cards/pierre-hero-hd-v2.webp",
  S: "/apps/profil-mapp/images/profile-cards/abraham-hero-hd-v2.webp",
  C: "/apps/profil-mapp/images/profile-cards/moise-hero-hd-v2.webp",
  conquerant: "/apps/profil-mapp/images/profile-cards/paul-hero-hd-v2.webp",
  communiquant: "/apps/profil-mapp/images/profile-cards/pierre-hero-hd-v2.webp",
  facilitateur: "/apps/profil-mapp/images/profile-cards/abraham-hero-hd-v2.webp",
  analyste: "/apps/profil-mapp/images/profile-cards/moise-hero-hd-v2.webp",
};

const resultContent = {
  apest: { eyebrow: "Profil APEST", title: "Mon profil APEST", icon: Network },
} as const;

const resultArtwork = {
  fruit: {
    title: "Fruit de l’Esprit",
    eyebrow: null,
    image: "/identity/posts/fruit-de-lesprit.png",
    href: "/apps/je-suis-par-la-grace-de-dieu?test=fruit",
  },
  gifts: {
    title: "Dons spirituels",
    eyebrow: "Je suis ce que je suis",
    image: "/identity/posts/dons-spirituels.webp",
    href: "/apps/je-suis-par-la-grace-de-dieu?test=gifts",
  },
  skills: {
    title: "Compétences naturelles",
    eyebrow: "Je suis ce que je suis",
    image: "/identity/posts/competences-naturelles.webp",
    href: "/apps/je-suis-par-la-grace-de-dieu?test=skills",
  },
  generopoly: {
    title: "Mon profil financier",
    eyebrow: "Généropoly",
    image: "/identity/posts/generopoly.webp",
    href: "/apps/generopoly",
  },
} as const;

function ResultPost({ result }: { result: IdentityResult }) {
  if (result.kind === "mapp") {
    const primary = result.primaryCode ? profileNames[result.primaryCode] ?? result.primaryCode : "Profil MAPP";
    const secondary = result.secondaryCode ? profileNames[result.secondaryCode] ?? result.secondaryCode : null;
    const image = result.primaryCode ? mappImages[result.primaryCode] : null;
    const resultHref = result.attemptId
      ? `/apps/profil-mapp/test/${result.attemptId}/resultat${result.resultRevisionId ? `?revision=${result.resultRevisionId}` : ""}`
      : "/apps/profil-mapp";
    return (
      <Link className={`${styles.post} ${styles.mappPost}`} href={resultHref} aria-label="Ouvrir mon résultat Profil MAPP">
        {image ? <Image className={styles.postImage} src={image} alt="" fill priority sizes="(max-width: 767px) 33vw, 320px" /> : null}
        <span className={styles.postShade} />
        <span className={styles.postCopy}>
          <span className={styles.postKicker}>Profil MAPP</span>
          <strong>{primary}</strong>
          {secondary ? <small>avec {secondary}</small> : null}
          <span className={styles.openPost}>Voir le résultat <ArrowRight size={15} /></span>
        </span>
      </Link>
    );
  }

  if (result.kind in resultArtwork) {
    const artwork = resultArtwork[result.kind as keyof typeof resultArtwork];
    return (
      <Link className={`${styles.post} ${styles.imagePost}`} href={artwork.href} aria-label={`Ouvrir mon résultat ${artwork.title}`}>
        <Image
          className={styles.postImage}
          src={artwork.image}
          alt={artwork.title}
          fill
          sizes="(max-width: 767px) 33vw, 320px"
        />
        {result.kind !== "fruit" ? <>
          <span className={styles.postShade} />
          <span className={styles.postCopy}>
            <span className={styles.postKicker}>{artwork.eyebrow}</span>
            <strong>{artwork.title}</strong>
            <span className={styles.openPost}>Voir le résultat <ArrowRight size={15} /></span>
          </span>
        </> : null}
      </Link>
    );
  }

  const content = resultContent.apest;
  const Icon = content.icon;
  return (
    <Link className={`${styles.post} ${styles.editorialPost}`} href="/apps" aria-label={`Ouvrir ${content.title}`}>
      <span className={styles.postPattern} aria-hidden="true" />
      <span className={styles.postIcon} aria-hidden="true"><Icon /></span>
      <span className={styles.postCopy}>
        <span className={styles.postKicker}>{content.eyebrow}</span>
        <strong>{content.title}</strong>
        <span className={styles.openPost}>Voir le résultat <ArrowRight size={15} /></span>
      </span>
    </Link>
  );
}

function UpcomingPost({ item }: { item: IdentityUpcomingItem }) {
  return (
    <Link className={`${styles.post} ${styles.upcomingPost}`} href={item.href} aria-label={`Ouvrir ${item.name}`}>
      <span className={styles.upcomingIcon} aria-hidden="true">
        {item.iconUrl ? <img src={item.iconUrl} alt="" /> : <Clock3 />}
      </span>
      <span className={styles.postCopy}>
        <span className={styles.postKicker}>{item.category}</span>
        <strong>{item.name}</strong>
        <span className={styles.openPost}>Commencer <ArrowRight size={15} /></span>
      </span>
    </Link>
  );
}

export default function IdentityExperience(props: Props) {
  const [openStory, setOpenStory] = useState<IdentityStoryGroup | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "upcoming">("results");
  const nameParts = props.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Mon identité";
  const initials = `${nameParts[0]?.charAt(0) ?? "?"}${nameParts.length > 1 ? nameParts.at(-1)?.charAt(0) ?? "" : ""}`.toUpperCase();

  useEffect(() => {
    if (!openStory) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenStory(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [openStory]);

  const activeCount = activeTab === "results" ? props.results.length : props.upcoming.length;

  return (
    <div className={styles.page}>
      <header className={styles.profile}>
        <div className={styles.avatarRing}>
          <div className={styles.avatar}>
            {props.avatarUrl ? <img src={props.avatarUrl} alt={`Photo de profil de ${props.fullName}`} /> : <span>{initials}</span>}
          </div>
        </div>
        <div className={styles.profileContent}>
          <p className={styles.eyebrow}>Mon espace personnel</p>
          <div className={styles.nameLine}>
            <h1>{firstName}</h1>
            <span>{props.status}</span>
          </div>
          <div className={styles.metrics} aria-label="Mes statistiques Ministry School">
            <div><strong>{props.studentCount}</strong><span>Étudiants à mes côtés</span></div>
            <div><strong>{props.months}</strong><span>Mois ensemble</span></div>
            <div><strong>{props.completedTests}</strong><span>Tests réalisés</span></div>
          </div>
          <p className={styles.bio}>Mes réponses, mes résultats et mes découvertes, réunis au même endroit.</p>
        </div>
      </header>

      {props.stories.length ? (
        <section className={styles.storySection} aria-label="Mes stories">
          <div className={styles.stories}>
            {props.stories.map((story) => (
              <button className={styles.story} type="button" key={story.key} onClick={() => setOpenStory(story)} aria-haspopup="dialog">
                <span className={styles.storyRing}>
                  <span className={styles.storyInner}><Image src={story.image} alt="" fill sizes="88px" /></span>
                </span>
                <strong>{story.label}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.feed} aria-label="Publications de mon identité">
        <div className={styles.tabs} role="tablist" aria-label="Filtrer les publications">
          <button type="button" role="tab" aria-selected={activeTab === "results"} className={activeTab === "results" ? styles.activeTab : ""} onClick={() => setActiveTab("results")}>
            <Grid3X3 /> Mes résultats
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "upcoming"} className={activeTab === "upcoming" ? styles.activeTab : ""} onClick={() => setActiveTab("upcoming")}>
            <Clock3 /> À venir
          </button>
        </div>
        <p className={styles.publicationCount} aria-live="polite">{activeCount} publication{activeCount > 1 ? "s" : ""}</p>

        {activeTab === "results" ? (
          props.results.length ? (
            <div className={styles.grid}>{props.results.map((result) => <ResultPost key={`${result.kind}-${result.attemptId ?? result.completedAt}`} result={result} />)}</div>
          ) : (
            <div className={styles.empty}>
              <span><BookOpen /></span>
              <div><strong>Ta collection commence ici</strong><p>Les résultats apparaîtront après la finalisation d’un test. Un test en cours ne publie rien.</p></div>
            </div>
          )
        ) : props.upcoming.length ? (
          <div className={styles.grid}>{props.upcoming.map((item) => <UpcomingPost item={item} key={item.key} />)}</div>
        ) : (
          <div className={styles.empty}>
            <span><Clock3 /></span>
            <div><strong>Rien à afficher pour le moment</strong><p>Les prochains tests apparaîtront ici dès leur publication dans Ministry School.</p></div>
          </div>
        )}
      </section>

      {openStory ? (
        <div className={`${styles.modalBackdrop} app-modal-layer`} role="presentation" onMouseDown={() => setOpenStory(null)}>
          <section className={styles.storyModal} role="dialog" aria-modal="true" aria-labelledby="story-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className={styles.close} onClick={() => setOpenStory(null)} aria-label="Fermer"><X /></button>
            <div className={styles.modalHero}><Image src={openStory.image} alt="" fill sizes="(max-width: 700px) 100vw, 520px" /><span /></div>
            <div className={styles.modalContent}>
              <p>Ma story</p>
              <h2 id="story-dialog-title">{openStory.label}</h2>
              <div className={styles.storyLinks}>
                {openStory.items.map((item) => (
                  <Link href={item.href} key={item.key} onClick={() => setOpenStory(null)}>
                    <span className={styles.toolIcon}>{item.iconUrl ? <img src={item.iconUrl} alt="" /> : <Sparkles />}</span>
                    <strong>{item.name}</strong>
                    <ArrowRight />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
