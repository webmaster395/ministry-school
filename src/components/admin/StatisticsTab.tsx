"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Download, Expand, List, Mail, PieChart, X } from "lucide-react";
import BarChart, { type BarDatum } from "@/components/BarChart";
import MinistryPicto from "@/components/MinistryPicto";
import { parseMlkEngagement } from "@/lib/mlk-engagement";
import { getMinistry } from "@/lib/ministry";
import { memberStatus, type Member } from "@/lib/data/admin-hub";
import type { Ministry } from "@/lib/data/admin";

type ViewMode = "pie" | "bar" | "list";
type Dataset = { title: string; subtitle: string; data: BarDatum[] };

const membersHref = (filter = "") => `/gestion/admin?onglet=membres${filter ? `&${filter}` : ""}`;
const COLORS = ["#27302f", "#2db8bd", "#f4a000", "#ef979c", "#d0e866", "#f04423", "#7b9fc5", "#9c7ac4"];

function StatCard({ value, label, detail, href }: { value: number; label: string; detail?: string; href?: string }) {
  const content = <><p className="font-title text-[32px] leading-none text-foreground tabular-nums">{value}</p><p className="mt-3 text-sm font-medium text-foreground">{label}</p>{detail && <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>}</>;
  return href ? <Link href={href} className="rounded-lg border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">{content}</Link> : <div className="rounded-lg border border-border bg-background p-5">{content}</div>;
}

function datumColor(datum: BarDatum, index: number) {
  return getMinistry(datum.slug)?.color ?? COLORS[index % COLORS.length];
}

function DataLink({ datum, children, className = "" }: { datum: BarDatum; children: React.ReactNode; className?: string }) {
  return datum.href ? <Link href={datum.href} className={className}>{children}</Link> : <div className={className}>{children}</div>;
}

function ListView({ data }: { data: BarDatum[] }) {
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  return <ul className="mt-5 divide-y divide-border-soft">{data.map((datum, index) => (
    <li key={datum.label}>
      <DataLink datum={datum} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md py-3 text-sm transition hover:bg-surface/70 sm:px-2">
        <span className="flex min-w-0 items-center gap-3 text-foreground">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center text-lg" aria-hidden="true">{datum.slug ? <MinistryPicto slug={datum.slug} size={22} /> : datum.fallbackIcon ?? <i className="block h-3 w-3 rounded-full" style={{ background: datumColor(datum, index) }} />}</span>
          <span>{datum.label}</span>
        </span>
        <span className="flex items-baseline gap-3"><strong className="font-title text-xl tabular-nums text-foreground">{datum.value}</strong><small className="w-10 text-right text-muted">{total ? Math.round((datum.value / total) * 100) : 0} %</small></span>
      </DataLink>
    </li>
  ))}</ul>;
}

function PieView({ data }: { data: BarDatum[] }) {
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  let cursor = 0;
  const stops = data.map((datum, index) => {
    const start = cursor;
    cursor += total ? (datum.value / total) * 100 : 0;
    return `${datumColor(datum, index)} ${start}% ${cursor}%`;
  });
  return <div className="mt-6 grid items-center gap-7 md:grid-cols-[minmax(180px,240px)_1fr]">
    <div className="relative mx-auto aspect-square w-full max-w-[240px] rounded-full" style={{ background: total ? `conic-gradient(${stops.join(",")})` : "var(--surface)" }} role="img" aria-label={`Répartition de ${total} membres`}>
      <div className="absolute inset-[27%] flex flex-col items-center justify-center rounded-full bg-background shadow-sm"><strong className="font-title text-[30px] leading-none text-foreground">{total}</strong><span className="mt-1 text-[11px] uppercase tracking-wider text-muted">total</span></div>
    </div>
    <ListView data={data} />
  </div>;
}

function DataSection({ dataset, view }: { dataset: Dataset; view: ViewMode }) {
  if (view === "bar") return <BarChart title={dataset.title} subtitle={dataset.subtitle} data={dataset.data} />;
  return <section className="rounded-lg border border-border bg-background p-4 sm:p-6"><h2 className="label text-xs tracking-[0.18em] text-muted">{dataset.title}</h2><p className="mt-1 text-sm text-muted">{dataset.subtitle}</p>{view === "pie" ? <PieView data={dataset.data} /> : <ListView data={dataset.data} />}</section>;
}

export default function StatisticsTab({ members, ministries }: { members: Member[]; ministries: Ministry[] }) {
  const [view, setView] = useState<ViewMode>("bar");
  const [presenting, setPresenting] = useState(false);
  const total = members.length;
  const statuses = { active: members.filter((m) => memberStatus(m) === "actif").length, pending: members.filter((m) => memberStatus(m) === "a_confirmer").length, disabled: members.filter((m) => memberStatus(m) === "desactive").length };
  const engagement = members.map((member) => parseMlkEngagement(member.notification_prefs));

  const accountData: BarDatum[] = [
    { label: "Comptes actifs", value: statuses.active, href: membersHref("statut=actif") },
    { label: "À confirmer", value: statuses.pending, href: membersHref("statut=a_confirmer") },
    { label: "Désactivés", value: statuses.disabled, href: membersHref("statut=desactive") },
  ];
  const engagementData: BarDatum[] = [
    { label: "Aucun engagement", value: engagement.filter((i) => i.completed && i.none).length, href: membersHref("implication=aucun") },
    { label: "Équipiers MLK", value: engagement.filter((i) => i.completed && i.equipier).length, href: membersHref("implication=equipier") },
    { label: "Managers et adjoints", value: engagement.filter((i) => i.completed && i.manager).length, href: membersHref("implication=manager") },
    { label: "Collaborateurs salariés", value: engagement.filter((i) => i.completed && i.collaborator).length, href: membersHref("implication=collaborateur") },
    { label: "Non renseigné", value: engagement.filter((i) => !i.completed).length, href: membersHref("implication=non_renseigne") },
  ];
  const genderData: BarDatum[] = [
    { label: "Femmes", value: members.filter((m) => m.gender === "femme").length, href: membersHref("genre=femme") },
    { label: "Hommes", value: members.filter((m) => m.gender === "homme").length, href: membersHref("genre=homme") },
    { label: "Non renseigné", value: members.filter((m) => m.gender !== "femme" && m.gender !== "homme").length, href: membersHref("genre=non_renseigne") },
  ];
  const ministryData: BarDatum[] = [...ministries.map((m) => ({ label: m.name, value: members.filter((member) => member.ministry_id === m.id).length, slug: m.slug, href: membersHref(`sens=${m.slug}`) })), { label: "Ne sais pas encore", value: members.filter((m) => !m.ministry_id).length, fallbackIcon: "🤔", href: membersHref("sens=non_renseignee") }];
  const rolesData: BarDatum[] = [
    { label: "Étudiants", value: members.filter((m) => m.role === "student").length, href: membersHref("role=etudiant") },
    { label: "Formateurs", value: members.filter((m) => m.is_teacher || m.role === "teacher").length, href: membersHref("role=enseignant") },
    { label: "Responsables de service", value: members.filter((m) => m.is_service_lead).length, href: membersHref("role=responsable") },
    { label: "Chefs de projet", value: members.filter((m) => m.is_project_lead).length, href: membersHref("role=chef") },
    { label: "Pilotage ministériel", value: members.filter((m) => Boolean(m.ministry_lead_of)).length, href: membersHref("role=pilotage") },
    { label: "Administrateurs", value: members.filter((m) => m.role === "admin").length, href: membersHref("role=admin") },
  ];
  const completenessData: BarDatum[] = [
    { label: "Genre renseigné", value: members.filter((m) => m.gender === "femme" || m.gender === "homme").length },
    { label: "Sensibilité identifiée", value: members.filter((m) => Boolean(m.ministry_id)).length },
    { label: "Implication renseignée", value: engagement.filter((i) => i.completed).length },
    { label: "Photo ajoutée", value: members.filter((m) => Boolean(m.avatar_path)).length },
  ];
  const months = new Map<string, number>();
  members.forEach((member) => { const month = member.created_at.slice(0, 7); if (month) months.set(month, (months.get(month) ?? 0) + 1); });
  const monthlyData: BarDatum[] = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, value]) => ({ label: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`)), value }));
  const datasets: Dataset[] = [
    { title: "État des comptes", subtitle: "Situation actuelle des accès à la plateforme.", data: accountData },
    { title: "Implication à MLK", subtitle: "Un seul statut d'implication par membre.", data: engagementData },
    { title: "Répartition par genre", subtitle: "Selon les informations déclarées par les membres.", data: genderData },
    { title: "Sensibilités ministérielles", subtitle: "Sensibilité choisie par chaque membre.", data: ministryData },
    { title: "Rôles et accès", subtitle: "Certains accès peuvent se cumuler pour une même personne.", data: rolesData },
    { title: "Complétude des profils", subtitle: "Nombre de membres ayant renseigné chaque information.", data: completenessData },
    { title: "Évolution des inscriptions", subtitle: "Nouveaux comptes créés par mois.", data: monthlyData },
  ];

  const reportText = [`Statistiques Ministry School — ${total} membres`, "", ...datasets.flatMap((set) => [set.title, ...set.data.map((d) => `• ${d.label} : ${d.value}`), ""])].join("\n");
  const mailHref = `mailto:?subject=${encodeURIComponent("Statistiques des membres — Ministry School")}&body=${encodeURIComponent(reportText)}`;
  function downloadCsv() {
    const rows = [["Section", "Catégorie", "Nombre", "Pourcentage"]];
    datasets.forEach((set) => { const sum = set.data.reduce((n, d) => n + d.value, 0); set.data.forEach((d) => rows.push([set.title, d.label, String(d.value), `${sum ? Math.round((d.value / sum) * 100) : 0} %`])); });
    const csv = `\ufeff${rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `statistiques-ministry-school-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function startPresentation() { setPresenting(true); try { await document.documentElement.requestFullscreen?.(); } catch {} }
  async function stopPresentation() { setPresenting(false); if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined); }

  return <div className={presenting ? "fixed inset-0 z-[100] overflow-y-auto bg-[#f7f4ed] p-4 sm:p-8" : "space-y-6"}>
    <div className={presenting ? "mx-auto max-w-[1500px] space-y-7" : "space-y-6"}>
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="label text-xs tracking-[0.18em] text-muted">Statistiques des membres</p><h1 className="font-title mt-2 text-[28px] leading-tight text-foreground sm:text-[34px]">Comprendre la communauté Ministry School</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Vue complète et actualisée des membres. Clique sur une catégorie pour ouvrir la liste correspondante.</p></div>
        <div className="flex flex-wrap gap-2">
          <a href={mailHref} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3.5 text-sm text-foreground hover:border-foreground/40"><Mail size={16} /> Envoyer par e-mail</a>
          <button type="button" onClick={downloadCsv} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3.5 text-sm text-foreground hover:border-foreground/40"><Download size={16} /> Télécharger le CSV</button>
          {presenting ? <button type="button" onClick={stopPresentation} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-accent px-3.5 text-sm text-on-accent"><X size={16} /> Quitter</button> : <button type="button" onClick={startPresentation} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-accent px-3.5 text-sm text-on-accent"><Expand size={16} /> Mode présentation</button>}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-2">
        <span className="px-2 text-xs font-medium uppercase tracking-wider text-muted">Présentation des données</span>
        <div className="grid w-full grid-cols-3 gap-1 sm:w-auto" role="group" aria-label="Choisir la présentation des statistiques">{([['pie', PieChart, 'Camembert'], ['bar', BarChart3, 'Graphique'], ['list', List, 'Liste']] as const).map(([key, Icon, label]) => <button key={key} type="button" onClick={() => setView(key)} aria-pressed={view === key} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm transition ${view === key ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}><Icon size={16} /> {label}</button>)}</div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard value={total} label="Membres au total" href={membersHref()} /><StatCard value={statuses.active} label="Comptes actifs" detail={total ? `${Math.round((statuses.active / total) * 100)} % des membres` : undefined} href={membersHref("statut=actif")} /><StatCard value={statuses.pending} label="À confirmer" detail="Adresse e-mail non confirmée" href={membersHref("statut=a_confirmer")} /><StatCard value={statuses.disabled} label="Comptes désactivés" href={membersHref("statut=desactive")} /></section>
      <div className={`grid items-start gap-6 ${presenting ? "2xl:grid-cols-3" : "xl:grid-cols-2"}`}>{datasets.map((dataset) => <DataSection key={dataset.title} dataset={dataset} view={view} />)}</div>
    </div>
  </div>;
}
