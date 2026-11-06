"use client";

/* eslint-disable @next/next/no-img-element -- avatars et icônes administrables */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronLeft, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { IdentityResult } from "@/lib/identity/dashboard";
import styles from "./identity.module.css";

export type IdentityStoryItem = { key: string; name: string; href: string; iconUrl: string | null };
export type IdentityStoryGroup = { key: "identity" | "finance" | "recommendations"; label: string; image: string; items: IdentityStoryItem[] };

type Props = {
  firstName: string; avatarUrl: string | null; gender: "homme" | "femme" | null; certified: boolean;
  studentCount: number; months: number; completedTests: number; stories: IdentityStoryGroup[]; results: IdentityResult[];
};

const profileNames: Record<string, string> = { D: "Conquérant", I: "Communiquant", S: "Facilitateur", C: "Analyste", conquerant: "Conquérant", communiquant: "Communiquant", facilitateur: "Facilitateur", analyste: "Analyste" };
const mappImages: Record<string, string> = {
  D: "/apps/profil-mapp/images/profile-cards/moise-hero-hd-v2.webp", I: "/apps/profil-mapp/images/profile-cards/paul-hero-hd-v2.webp",
  S: "/apps/profil-mapp/images/profile-cards/pierre-hero-hd-v2.webp", C: "/apps/profil-mapp/images/profile-cards/abraham-hero-hd-v2.webp",
  conquerant: "/apps/profil-mapp/images/profile-cards/moise-hero-hd-v2.webp", communiquant: "/apps/profil-mapp/images/profile-cards/paul-hero-hd-v2.webp",
  facilitateur: "/apps/profil-mapp/images/profile-cards/pierre-hero-hd-v2.webp", analyste: "/apps/profil-mapp/images/profile-cards/abraham-hero-hd-v2.webp",
};
const gracePosts = {
  fruit: { title: "Mes fruits de l’Esprit", kicker: "Ce qui grandit en moi", tone: "rose" },
  gifts: { title: "Mes dons spirituels", kicker: "Ma manière de contribuer", tone: "green" },
  skills: { title: "Mes compétences naturelles", kicker: "Ce que j’aime mobiliser", tone: "gold" },
} as const;

function ResultPost({ result }: { result: IdentityResult }) {
  if (result.kind === "mapp") {
    const primary = result.primaryCode ? profileNames[result.primaryCode] ?? result.primaryCode : "Profil MAPP";
    const secondary = result.secondaryCode ? profileNames[result.secondaryCode] ?? result.secondaryCode : null;
    const image = result.primaryCode ? mappImages[result.primaryCode] : null;
    const resultHref = result.attemptId ? `/apps/profil-mapp/test/${result.attemptId}/resultat${result.resultRevisionId ? `?revision=${result.resultRevisionId}` : ""}` : "/apps/profil-mapp";
    return <Link className={`${styles.post} ${styles.mappPost}`} href={resultHref} aria-label="Ouvrir mon résultat Profil MAPP">
      {image ? <Image className={styles.postImage} src={image} alt="" fill sizes="(max-width: 700px) 50vw, 320px" /> : null}<span className={styles.postShade} />
      <span className={styles.postCopy}><span className={styles.postKicker}>Mon profil MAPP</span><strong>{primary}</strong>{secondary ? <small>avec {secondary}</small> : null}<span className={styles.openPost}>Voir mon résultat <ArrowRight size={15} /></span></span>
    </Link>;
  }
  const content = gracePosts[result.kind];
  if (!content) return null;
  return <Link className={`${styles.post} ${styles[`post_${content.tone}`]}`} href="/apps/je-suis-par-la-grace-de-dieu" aria-label={`Ouvrir ${content.title}`}>
    <span className={styles.postOrnament} aria-hidden="true"><Sparkles /></span><span className={styles.postCopy}><span className={styles.postKicker}>{content.kicker}</span><strong>{content.title}</strong><span className={styles.openPost}>Voir mon résultat <ArrowRight size={15} /></span></span>
  </Link>;
}

export default function IdentityExperience(props: Props) {
  const [openStory, setOpenStory] = useState<IdentityStoryGroup | null>(null);
  const initial = props.firstName.charAt(0).toUpperCase() || "?";
  const status = props.gender === "femme" ? "Étudiante" : props.gender === "homme" ? "Étudiant" : "Étudiant·e";
  return <main className={styles.page}>
    <section className={styles.profileCard}><div className={styles.banner} aria-hidden="true"><span /><span /><span /></div><div className={styles.profileBody}>
      <div className={styles.identityLine}><div className={styles.avatar}>{props.avatarUrl ? <img src={props.avatarUrl} alt="" /> : initial}</div><div className={styles.person}><p>Mon identité</p><h1>{props.firstName}</h1><div className={styles.badges}><span>{status}</span>{props.certified ? <span className={styles.certified}>Certifié</span> : null}</div></div></div>
      <div className={styles.metrics} aria-label="Mes statistiques Ministry School"><div><strong>{props.studentCount}</strong><span>Étudiants<br />à mes côtés</span></div><div><strong>{props.months}</strong><span>Mois<br />ensemble</span></div><div><strong>{props.completedTests}</strong><span>Tests<br />réalisés</span></div></div>
    </div></section>

    {props.stories.length ? <section className={styles.storySection} aria-labelledby="stories-title"><div className={styles.sectionHeading}><div><p>Explorer</p><h2 id="stories-title">Mes univers</h2></div><span>Outils publiés</span></div><div className={styles.stories}>{props.stories.map((story) => <button className={styles.story} type="button" key={story.key} onClick={() => setOpenStory(story)} aria-haspopup="dialog"><span className={styles.storyRing}><span className={styles.storyInner}><Image src={story.image} alt="" fill sizes="96px" /></span></span><strong>{story.label}</strong><small>{story.items.length} accès</small></button>)}</div></section> : null}

    <section className={styles.results} aria-labelledby="results-title"><div className={styles.sectionHeading}><div><p>Ma collection</p><h2 id="results-title">Mes résultats</h2></div><span>{props.results.length} publication{props.results.length > 1 ? "s" : ""}</span></div>
      {props.results.length ? <div className={styles.grid}>{props.results.map((result, index) => <ResultPost key={`${result.kind}-${result.attemptId ?? result.completedAt}-${index}`} result={result} />)}</div> : <div className={styles.empty}><span><BookOpen size={22} /></span><div><strong>Ta collection commence ici</strong><p>Les résultats apparaîtront après la finalisation d’un test. Un test en cours ne publie rien.</p></div></div>}
    </section>

    {openStory ? <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setOpenStory(null)}><section className={styles.storyModal} role="dialog" aria-modal="true" aria-labelledby="story-dialog-title" onMouseDown={(event) => event.stopPropagation()}><button type="button" className={styles.close} onClick={() => setOpenStory(null)} aria-label="Fermer"><X size={20} /></button><div className={styles.modalHero}><Image src={openStory.image} alt="" fill sizes="(max-width: 700px) 100vw, 520px" /><span /></div><div className={styles.modalContent}><p>Mon univers</p><h2 id="story-dialog-title">{openStory.label}</h2><div className={styles.storyLinks}>{openStory.items.map((item) => <Link href={item.href} key={item.key} onClick={() => setOpenStory(null)}><span className={styles.toolIcon}>{item.iconUrl ? <img src={item.iconUrl} alt="" /> : <Sparkles size={18} />}</span><strong>{item.name}</strong><ArrowRight size={17} /></Link>)}</div></div><button type="button" className={styles.backMobile} onClick={() => setOpenStory(null)}><ChevronLeft size={17} /> Retour à mon profil</button></section></div> : null}
  </main>;
}
