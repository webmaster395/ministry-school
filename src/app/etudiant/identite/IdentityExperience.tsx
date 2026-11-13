"use client";

/* eslint-disable @next/next/no-img-element -- avatars et icônes administrables */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, Check, Clock3, Grid3X3, Network, Plus } from "lucide-react";
import { useRef, useState } from "react";
import AvatarEditor from "@/components/AvatarEditor";
import type { IdentityResult } from "@/lib/identity/dashboard";
import styles from "./identity.module.css";

export type IdentityStoryItem = {
  key: string;
  name: string;
  category: "Identité" | "Finance";
  href: string;
  image: string;
  status: "not-started" | "completed" | "available";
  measurable: boolean;
  external?: boolean;
  links?: Array<{ name: string; href: string; external?: boolean }>;
};
export type IdentityUpcomingItem = { key: string; name: string; href: string; iconUrl: string | null; category: string };

type Props = {
  userId: string;
  fullName: string;
  status: string;
  avatarUrl: string | null;
  studentCount: number;
  months: number;
  completedTests: number;
  stories: IdentityStoryItem[];
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
    eyebrow: "Je suis ce que je suis",
    image: "/apps/grace-identity/fruit-spirit-blueberry-abstract-v1.webp",
    href: "/etudiant/identite/fruit-de-lesprit",
  },
  gifts: {
    title: "Dons spirituels",
    eyebrow: "Je suis ce que je suis",
    image: "/identity/posts/dons-spirituels.webp",
    href: "/etudiant/identite/dons-spirituels",
  },
  skills: {
    title: "Compétences naturelles",
    eyebrow: "Je suis ce que je suis",
    image: "/identity/posts/competences-naturelles.webp",
    href: "/etudiant/identite/competences-naturelles",
  },
  generopoly: {
    title: "Mon profil financier",
    eyebrow: "Généropoly",
    image: "/identity/posts/generopoly.webp",
    href: "/apps/generopoly",
  },
  "life-line": {
    title: "Ma ligne de vie",
    eyebrow: "Mon identité",
    image: "/identity/posts/ligne-de-vie.webp",
    href: "/etudiant/ligne-de-vie",
  },
} as const;

function ResultPost({ result, firstName }: { result: IdentityResult; firstName: string }) {
  if (result.kind === "heroes-motors") {
    return (
      <Link
        className={`${styles.post} ${styles.heroesPost} ${styles.imagePost}`}
        href="/etudiant/identite/mes-moteurs"
        aria-label="Ouvrir Mes héros, mes moteurs"
      >
        <span className={styles.heroesGlow} aria-hidden="true" />
        <span className={styles.postShade} />
        <span className={styles.postCopy}>
          <span className={styles.postKicker}>Test des héros</span>
          <strong>Moi, {firstName}, je suis…</strong>
          <span className={styles.openPost}>Voir le résultat <ArrowRight size={15} /></span>
        </span>
      </Link>
    );
  }

  if (result.kind === "mapp") {
    const primary = result.primaryCode ? profileNames[result.primaryCode] ?? result.primaryCode : "Profil MAPP";
    const secondary = result.secondaryCode ? profileNames[result.secondaryCode] ?? result.secondaryCode : null;
    const image = result.primaryCode ? mappImages[result.primaryCode] : null;
    const resultQuery = new URLSearchParams();
    if (result.resultRevisionId) resultQuery.set("revision", result.resultRevisionId);
    if (result.native) resultQuery.set("native", "1");
    if (result.legacy) resultQuery.set("legacy", "1");
    const resultHref = result.attemptId
      ? `/apps/profil-mapp/test/${result.attemptId}/resultat${resultQuery.size ? `?${resultQuery.toString()}` : ""}`
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
      <Link className={`${styles.post} ${styles.imagePost} ${result.kind === "fruit" ? styles.fruitPost : ""}`} href={artwork.href} aria-label={`Ouvrir mon résultat ${artwork.title}`}>
        {result.kind === "fruit" ? <span className={styles.fruitArtwork} aria-hidden="true" /> : <Image
          className={styles.postImage}
          src={artwork.image}
          alt=""
          fill
          sizes="(max-width: 767px) 33vw, 320px"
        />}
        <span className={styles.postShade} />
        <span className={styles.postCopy}>
          <span className={styles.postKicker}>{artwork.eyebrow}</span>
          <strong>{artwork.title}</strong>
          <span className={styles.openPost}>Voir le résultat <ArrowRight size={15} /></span>
        </span>
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
  const [activeTab, setActiveTab] = useState<"results" | "upcoming">("results");
  const feedRef = useRef<HTMLElement>(null);
  const nameParts = props.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Mon identité";

  function openUpcoming() {
    setActiveTab("upcoming");
    requestAnimationFrame(() => feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const activeCount = activeTab === "results" ? props.results.length : props.upcoming.length;
  const activeCountLabel = activeTab === "results"
    ? `publication${activeCount > 1 ? "s" : ""}`
    : `outil${activeCount > 1 ? "s" : ""} à faire`;
  const measurableStories = props.stories.filter((story) => story.measurable);
  const completedStoryCount = measurableStories.filter((story) => story.status === "completed").length;
  const remainingStoryCount = measurableStories.length - completedStoryCount;
  const nextStory = measurableStories.find((story) => story.status !== "completed");

  return (
    <div className={styles.page}>
      <header className={styles.profile}>
        <div className={styles.avatarRing}>
          <div className={styles.avatar}>
            <AvatarEditor
              userId={props.userId}
              fullName={props.fullName}
              initialUrl={props.avatarUrl}
              variant="identity"
            />
          </div>
        </div>
        <div className={styles.profileContent}>
          <p className={styles.eyebrow}>Mon espace personnel</p>
          <div className={styles.nameLine}>
            <h1>{firstName}</h1>
            <span className={styles.certifiedStatus}>{props.status}<BadgeCheck aria-label="Profil certifié" /></span>
          </div>
          <div className={styles.metrics} aria-label="Mes statistiques Ministry School">
            <div><strong>{props.studentCount}</strong><span>Étudiants à mes côtés</span></div>
            <div><strong>{props.months}</strong><span>Mois ensemble</span></div>
            <div><strong>{props.completedTests}</strong><span>Tests réalisés</span></div>
          </div>
          <blockquote className={styles.bio}>
            <p>« Je te loue de ce que je suis une créature si merveilleuse. Tes œuvres sont admirables. »</p>
            <cite>Psaume 139:14</cite>
          </blockquote>
        </div>
      </header>

      {props.stories.length ? (
        <section className={styles.storySection} aria-label="Mes outils">
          <div className={styles.stories}>
            {props.stories.map((story) => story.links ? (
              <Link
                className={`${styles.story} ${styles[`story_${story.status}`]}`}
                key={story.key}
                href="/etudiant/ressources"
                aria-label="Ouvrir la bibliothèque de ressources"
              >
                <span className={styles.storyRing} data-story-key={story.key}>
                  <span className={styles.storyInner}><Image src={story.image} alt="" fill sizes="112px" /></span>
                  <span className={styles.storyBadge}><Plus /></span>
                </span>
                <strong>{story.name}</strong>
              </Link>
            ) : (
              <Link
                className={`${styles.story} ${styles[`story_${story.status}`]}`}
                href={story.href}
                key={story.key}
                target={story.external ? "_blank" : undefined}
                rel={story.external ? "noreferrer" : undefined}
                aria-label={`${story.status === "completed" ? "Consulter" : "Ouvrir"} ${story.name}`}
              >
                <span className={styles.storyRing} data-story-key={story.key}>
                  <span className={styles.storyInner}><Image src={story.image} alt="" fill sizes="112px" /></span>
                  {story.status === "completed" ? <span className={styles.storyBadge}><Check /></span> : null}
                  {story.status === "not-started" ? <span className={styles.storyBadge}><Plus /></span> : null}
                </span>
                <strong>{story.name}</strong>
              </Link>
            ))}
          </div>
          {measurableStories.length > 0 && remainingStoryCount > 0 && nextStory ? (
            <button
              type="button"
              className={styles.discoveryProgress}
              onClick={openUpcoming}
              aria-label={`Continuer avec ${nextStory.name}. ${completedStoryCount} outils terminés sur ${measurableStories.length}`}
            >
              <span className={styles.discoveryMark} aria-hidden="true">✦</span>
              <div className={styles.discoveryCopy}>
                <strong>Continue à te découvrir</strong>
                <span>Il te reste {remainingStoryCount} outil{remainingStoryCount > 1 ? "s" : ""} à explorer.</span>
              </div>
              <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${completedStoryCount / measurableStories.length * 100}%` }} /></div>
              <strong className={styles.progressCount}>{completedStoryCount} / {measurableStories.length}</strong>
            </button>
          ) : null}
        </section>
      ) : null}

      <section ref={feedRef} className={styles.feed} aria-label="Publications de mon identité">
        <div className={styles.tabs} role="tablist" aria-label="Filtrer les publications">
          <button type="button" role="tab" aria-selected={activeTab === "results"} className={activeTab === "results" ? styles.activeTab : ""} onClick={() => setActiveTab("results")}>
            <Grid3X3 /> Mes résultats
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "upcoming"} className={activeTab === "upcoming" ? styles.activeTab : ""} onClick={() => setActiveTab("upcoming")}>
            <Clock3 /> À faire
          </button>
        </div>
        <p className={styles.publicationCount} aria-live="polite">{activeCount} {activeCountLabel}</p>

        {activeTab === "results" ? (
          props.results.length ? (
            <div className={styles.grid}>{props.results.map((result) => <ResultPost key={`${result.kind}-${result.attemptId ?? result.completedAt}`} result={result} firstName={firstName} />)}</div>
          ) : (
            <div className={styles.empty}>
              <span><BookOpen /></span>
              <div><strong>Ta collection commence ici</strong><p>Les résultats apparaîtront après la finalisation d’un test. Un test en cours ne publie rien.</p></div>
            </div>
          )
        ) : activeTab === "upcoming" && props.upcoming.length ? (
          <div className={styles.grid}>{props.upcoming.map((item) => <UpcomingPost item={item} key={item.key} />)}</div>
        ) : (
          <div className={styles.empty}>
            <span><Clock3 /></span>
            <div><strong>Rien à afficher pour le moment</strong><p>Les prochains tests apparaîtront ici dès leur publication dans Ministry School.</p></div>
          </div>
        )}
      </section>
    </div>
  );
}
