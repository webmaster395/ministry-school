"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Download, FileDown, List, Mail, PieChart } from "lucide-react";
import BarChart, { type BarDatum } from "@/components/BarChart";
import MinistryPicto from "@/components/MinistryPicto";
import { parseMlkEngagement } from "@/lib/mlk-engagement";
import { getMinistry } from "@/lib/ministry";
import { memberStatus, type Member } from "@/lib/data/admin-hub";
import type { Ministry } from "@/lib/data/admin";

type ViewMode = "pie" | "bar" | "list";
type Dataset = { title: string; subtitle: string; data: BarDatum[] };

const membersHref = (filter = "") => `/gestion/admin?onglet=membres${filter ? `&${filter}` : ""}`;
const COLORS = ["#21302e", "#00a6a6", "#f2a900", "#df4b57", "#88a61b", "#e44a18", "#6657a5", "#147fba", "#a85d12", "#c74286", "#526a78", "#c09a00"];

function StatCard({ value, label, detail, href }: { value: number; label: string; detail?: string; href?: string }) {
  const content = <><p className="font-title text-[32px] leading-none text-foreground tabular-nums">{value}</p><p className="mt-3 text-sm font-medium text-foreground">{label}</p>{detail && <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>}</>;
  return href ? <Link href={href} className="rounded-lg border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">{content}</Link> : <div className="rounded-lg border border-border bg-background p-5">{content}</div>;
}

function datumColor(datum: BarDatum, index: number) {
  return datum.color ?? getMinistry(datum.slug)?.color ?? COLORS[index % COLORS.length];
}

function datumTextColor(datum: BarDatum, index: number) {
  if (datum.slug) return datum.slug === "docteur" ? "#fff" : "#27302f";
  if (datum.fallbackIcon || datum.color === "#27302f") return "#fff";
  return [2, 4, 7, 9, 11].includes(index % COLORS.length) ? "#27302f" : "#fff";
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
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  const slices = data.map((datum, index) => {
    const percent = total ? (datum.value / total) * 100 : 0;
    const previous = data.slice(0, index).reduce((sum, item) => sum + item.value, 0);
    const start = -90 + (total ? (previous / total) * 360 : 0);
    const end = start + percent * 3.6;
    const point = (angle: number, radius: number) => ({ x: 120 + radius * Math.cos((angle * Math.PI) / 180), y: 120 + radius * Math.sin((angle * Math.PI) / 180) });
    const from = point(start, 100);
    const to = point(percent >= 100 ? end - 0.01 : end, 100);
    const middle = point(start + (percent * 3.6) / 2, percent < 6 ? 91 : 68);
    const path = percent > 0 ? `M 120 120 L ${from.x} ${from.y} A 100 100 0 ${percent > 50 ? 1 : 0} 1 ${to.x} ${to.y} Z` : "";
    return { datum, index, percent, path, middle };
  });
  return <div className="mt-6 grid items-center gap-7 md:grid-cols-[minmax(180px,240px)_1fr]">
    <div className="relative mx-auto w-full max-w-[240px]">
    <svg viewBox="0 0 240 240" className="aspect-square w-full overflow-visible" role="img" aria-label={`Répartition de ${total} membres`}>
      {total === 0 && <circle cx="120" cy="120" r="100" fill="#ece8df" />}
      {slices.map(({ datum, index, percent, path, middle }) => path && <g key={datum.label} className="group cursor-help" onMouseEnter={() => setActiveSlice(index)} onMouseLeave={() => setActiveSlice(null)} onFocus={() => setActiveSlice(index)} onBlur={() => setActiveSlice(null)} tabIndex={0}><path d={path} fill={datumColor(datum, index)} stroke="#fffdf9" strokeWidth="3" className="origin-center transition duration-200 group-hover:opacity-80"><title>{datum.label} : {datum.value} — {Math.round(percent)} %</title></path><text x={middle.x} y={middle.y} textAnchor="middle" dominantBaseline="central" fill={datumTextColor(datum, index)} className="pointer-events-none text-[10px] font-bold" style={{ filter: datumTextColor(datum, index) === "#fff" ? "drop-shadow(0 1px 1px rgba(0,0,0,.35))" : "none" }}>{Math.round(percent)}%</text></g>)}
      <circle cx="120" cy="120" r="43" fill="var(--background)" />
      <text x="120" y="116" textAnchor="middle" className="fill-foreground font-title text-[28px]">{total}</text>
      <text x="120" y="136" textAnchor="middle" className="fill-muted text-[10px] uppercase tracking-wider">total</text>
    </svg>
    {activeSlice !== null && <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background shadow-lg">{slices[activeSlice].datum.label} · {slices[activeSlice].datum.value} · {Math.round(slices[activeSlice].percent)} %</div>}
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
  const ministryData: BarDatum[] = [...ministries.map((m) => ({ label: m.name, value: members.filter((member) => member.ministry_id === m.id).length, slug: m.slug, href: membersHref(`sens=${m.slug}`) })), { label: "Ne sais pas encore", value: members.filter((m) => !m.ministry_id).length, fallbackIcon: "🤔", color: "#27302f", href: membersHref("sens=non_renseignee") }];
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
  function generatePdf() {
    document.body.classList.add("statistics-printing");
    const cleanup = () => document.body.classList.remove("statistics-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  }

  return <div className="statistics-report space-y-6">
    <div className="space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="label text-xs tracking-[0.18em] text-muted">Statistiques des membres</p><h1 className="font-title mt-2 text-[28px] leading-tight text-foreground sm:text-[34px]">Comprendre la communauté Ministry School</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Vue complète et actualisée des membres. Clique sur une catégorie pour ouvrir la liste correspondante.</p></div>
        <div className="statistics-report__actions flex flex-wrap gap-2">
          <a href={mailHref} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3.5 text-sm text-foreground hover:border-foreground/40"><Mail size={16} /> Envoyer par e-mail</a>
          <button type="button" onClick={downloadCsv} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3.5 text-sm text-foreground hover:border-foreground/40"><Download size={16} /> Télécharger le CSV</button>
          <button type="button" onClick={generatePdf} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-accent px-3.5 text-sm text-on-accent"><FileDown size={16} /> Générer le PDF</button>
        </div>
      </header>

      <div className="statistics-report__controls flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-2">
        <span className="px-2 text-xs font-medium uppercase tracking-wider text-muted">Présentation des données</span>
        <div className="grid w-full grid-cols-3 gap-1 sm:w-auto" role="group" aria-label="Choisir la présentation des statistiques">{([['pie', PieChart, 'Camembert'], ['bar', BarChart3, 'Graphique'], ['list', List, 'Liste']] as const).map(([key, Icon, label]) => <button key={key} type="button" onClick={() => setView(key)} aria-pressed={view === key} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm transition ${view === key ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}><Icon size={16} /> {label}</button>)}</div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard value={total} label="Membres au total" href={membersHref()} /><StatCard value={statuses.active} label="Comptes actifs" detail={total ? `${Math.round((statuses.active / total) * 100)} % des membres` : undefined} href={membersHref("statut=actif")} /><StatCard value={statuses.pending} label="À confirmer" detail="Adresse e-mail non confirmée" href={membersHref("statut=a_confirmer")} /><StatCard value={statuses.disabled} label="Comptes désactivés" href={membersHref("statut=desactive")} /></section>
      <div className="statistics-report__grid grid items-start gap-6 xl:grid-cols-2">{datasets.map((dataset) => <DataSection key={dataset.title} dataset={dataset} view={view} />)}</div>
    </div>
  </div>;
}
