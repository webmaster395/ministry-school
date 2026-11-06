/* eslint-disable @next/next/no-img-element -- avatars signés et icônes administrables du catalogue */
import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { getStudentTools, type CatalogApp } from "@/lib/apps/catalog";
import { getViewer } from "@/lib/data/viewer";
import { getIdentityDashboard, type IdentityResult } from "@/lib/identity/dashboard";
import styles from "./identity.module.css";

export const dynamic = "force-dynamic";

type ToolStory = { key: string; name: string; href: string; iconUrl: string | null };

function storiesForTools(tools: CatalogApp[]): ToolStory[] {
  return tools.flatMap((tool) => {
    if (tool.slug === "je-suis-par-la-grace-de-dieu") {
      return [
        { key: `${tool.id}-fruit`, name: "Fruits de l’Esprit", href: tool.url, iconUrl: tool.iconUrl },
        { key: `${tool.id}-gifts`, name: "Dons spirituels", href: tool.url, iconUrl: tool.iconUrl },
        { key: `${tool.id}-skills`, name: "Compétences naturelles", href: tool.url, iconUrl: tool.iconUrl },
      ];
    }
    return [{ key: tool.id, name: tool.name, href: tool.url, iconUrl: tool.iconUrl }];
  });
}

const profileNames: Record<string, string> = {
  D: "Conquérant", I: "Communiquant", S: "Facilitateur", C: "Analyste",
  conquerant: "Conquérant", communiquant: "Communiquant",
  facilitateur: "Facilitateur", analyste: "Analyste",
};

const graceLabels: Record<string, { title: string; href: string }> = {
  fruit: { title: "Fruits de l’Esprit", href: "/apps/je-suis-par-la-grace-de-dieu" },
  gifts: { title: "Dons spirituels", href: "/apps/je-suis-par-la-grace-de-dieu" },
  skills: { title: "Compétences naturelles", href: "/apps/je-suis-par-la-grace-de-dieu" },
};

function monthsTogether(memberSince: string | null) {
  if (!memberSince) return 0;
  const start = new Date(memberSince);
  const now = new Date();
  return Math.max(0, (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + now.getUTCMonth() - start.getUTCMonth());
}

function ResultPost({ result }: { result: IdentityResult }) {
  if (result.kind === "mapp") {
    const primary = result.primaryCode ? profileNames[result.primaryCode] ?? result.primaryCode : null;
    const secondary = result.secondaryCode ? profileNames[result.secondaryCode] ?? result.secondaryCode : null;
    return <Link className={styles.post} href="/apps/profil-mapp">
      <div><p className={styles.eyebrow}>Profil MAPP · Terminé</p><h3 className={styles.postTitle}>Mon profil de fonctionnement</h3><p className={styles.summary}>{primary ? <>Profil principal : <strong>{primary}</strong>{secondary ? <> · secondaire : <strong>{secondary}</strong></> : null}.</> : "Ton résultat complet est disponible."}</p></div>
      <span className={styles.more}>Voir plus</span>
    </Link>;
  }
  const content = graceLabels[result.kind];
  if (!content) return null;
  return <Link className={styles.post} href={content.href}>
    <div><p className={styles.eyebrow}>Identité · Terminé</p><h3 className={styles.postTitle}>{content.title}</h3><p className={styles.summary}>Retrouve les réponses et résultats enregistrés par l’outil.</p></div>
    <span className={styles.more}>Voir plus</span>
  </Link>;
}

export default async function StudentIdentityPage() {
  const [viewer, dashboard, tools] = await Promise.all([getViewer(), getIdentityDashboard(), getStudentTools()]);
  const firstName = dashboard.profile.firstName || viewer?.fullName.split(" ")[0] || "Mon identité";
  const initial = firstName.charAt(0).toUpperCase() || "?";
  const months = monthsTogether(dashboard.profile.memberSince);
  const stories = storiesForTools(tools);
  const results = [...dashboard.identityResults, ...dashboard.financeResults];

  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.banner} aria-hidden="true" />
      <div className={styles.profile}>
        <div className={styles.avatar}>{viewer?.avatarUrl ? <img src={viewer.avatarUrl} alt="" /> : initial}</div>
        <div className={styles.nameRow}><h1 className={styles.name}>{firstName}</h1><span className={styles.status}>Étudiant</span>{dashboard.profile.certified ? <span className={styles.certified}>Certifié</span> : null}</div>
        <div className={styles.metrics}>
          <div className={styles.metric}><strong>{dashboard.metrics.studentCount}</strong><span>Étudiants à mes côtés</span></div>
          <div className={styles.metric}><strong>{months}</strong><span>Mois ensemble</span></div>
          <div className={styles.metric}><strong>{dashboard.metrics.completedTests}</strong><span>Tests réalisés</span></div>
        </div>
      </div>
    </section>

    {stories.length ? <nav className={styles.stories} aria-label="Outils et tests disponibles">{stories.map((story) => <Link className={styles.story} href={story.href} key={story.key}><span className={styles.storyRing}><span className={styles.storyInner}>{story.iconUrl ? <img src={story.iconUrl} alt="" /> : <Fingerprint size={25} />}</span></span><span>{story.name}</span></Link>)}</nav> : <div className={styles.empty}>Aucun outil n’est publié pour le moment.</div>}

    <section className={styles.section}><div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Mes résultats</h2><span className={styles.sectionHint}>Tests terminés</span></div>{results.length ? <div className={styles.grid}>{results.map((result, index) => <ResultPost key={`${result.kind}-${result.attemptId ?? index}`} result={result} />)}</div> : <div className={styles.empty}>Aucun résultat terminé pour le moment. Les tests en cours ne génèrent aucune publication.</div>}</section>
  </main>;
}
