"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, SlidersHorizontal, X } from "lucide-react";
import BarChart, { type BarDatum } from "@/components/BarChart";
import { parseMlkEngagement } from "@/lib/mlk-engagement";
import { getMinistry, sessionColor } from "@/lib/ministry";
import { memberStatus, type Member } from "@/lib/data/admin-hub";
import type { Ministry, MonthlyActiveUsers, OpportunityAnalytics, ProgramAnalytics, UsageAnalytics } from "@/lib/data/admin";
import { accountsByTrainingCycle, parisDateKey } from "@/lib/training-cycle-stats";
import AdminSelect from "@/components/admin/AdminSelect";

type Section = "utilisation" | "membres" | "programmes" | "initiatives";
const TRACKING_START = "7 octobre 2026";
const pageLabels: Record<string, string> = { home: "Accueil", courses: "Mes cours", course_detail: "Détail d’un cours", assignments: "À faire", profile: "Profil", notes: "Notes", services_projects: "Projets et formations" };
const sensitivityLabels: Record<string, string> = { apotre: "Apostolique", prophete: "Prophétique", evangeliste: "Évangéliste", pasteur: "Pastorale", docteur: "Doctorale" };

function Kpi({ value, label, detail }: { value: string | number; label: string; detail?: string }) {
  return <article className="min-h-[104px] min-w-0 rounded-xl border border-border bg-background p-3.5 sm:min-h-[132px] sm:p-5"><p className="font-title break-words text-[27px] leading-none text-foreground tabular-nums sm:text-[34px]">{value}</p><p className="mt-2 text-[13px] font-semibold leading-snug text-foreground sm:mt-3 sm:text-sm">{label}</p>{detail && <p className="mt-1 hidden text-xs leading-relaxed text-muted min-[390px]:block">{detail}</p>}</article>;
}

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-border bg-background p-4 sm:p-6 ${className}`}><h2 className="font-title text-[20px] text-foreground sm:text-[22px]">{title}</h2>{subtitle && <p className="mt-1 text-[13px] leading-relaxed text-muted sm:text-sm">{subtitle}</p>}<div className="mt-4 sm:mt-5">{children}</div></section>;
}

function ProportionRows({ rows, total }: { rows: { label: string; value: number; color?: string }[]; total: number }) {
  return <div className="space-y-5">{rows.map((row) => { const percent = total ? Math.round(row.value / total * 100) : 0; return <div key={row.label}><div className="mb-2 flex items-baseline justify-between gap-4"><span className="text-sm font-medium text-foreground">{row.label}</span><span className="text-sm text-muted"><strong className="text-foreground tabular-nums">{row.value}</strong> · {percent} %</span></div><div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${percent}%`, background: row.color ?? "var(--foreground)" }} /></div></div>; })}</div>;
}

function currentParisMonth() {
  const parts = new Intl.DateTimeFormat("fr-FR", { year: "numeric", month: "2-digit", timeZone: "Europe/Paris" }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-01`;
}

function weekLabel(date: string) {
  const text = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  return `Sem. ${text}`;
}

function sectionHref(section: Section) { return `/gestion/admin?onglet=statistiques&statistiques=${section}`; }

function StatisticsNav({ section }: { section: Section }) {
  return <nav aria-label="Sections des statistiques" className="grid w-full grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1 lg:inline-grid lg:w-auto lg:grid-cols-4">{([['utilisation', 'Engagement'], ['membres', 'Membres'], ['programmes', 'Programme'], ['initiatives', 'Projets et formations']] as const).map(([key, label]) => <Link key={key} href={sectionHref(key)} aria-current={section === key ? "page" : undefined} className={`min-w-0 rounded-lg px-2 py-2.5 text-center text-[12px] font-semibold transition min-[375px]:text-[13px] sm:px-5 sm:text-sm ${section === key ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}>{label}</Link>)}</nav>;
}

function UsageSection({ members, trainingDates, monthlyActivity, usage }: { members: Member[]; trainingDates: string[]; monthlyActivity: MonthlyActiveUsers[]; usage: UsageAnalytics }) {
  const total = members.length;
  const activeThisMonth = monthlyActivity.find((row) => row.activity_month === currentParisMonth())?.active_users ?? 0;
  const activityRate = total ? Math.round(activeThisMonth / total * 100) : 0;
  const cycles = accountsByTrainingCycle(members, trainingDates);
  const today = parisDateKey(new Date().toISOString());
  const currentCycle = cycles.find((cycle) => cycle.date >= today) ?? cycles.at(-1);
  const weekly: BarDatum[] = usage.weekly.map((row) => ({ label: weekLabel(row.week_start), value: row.active_users, color: "#00a6a6" }));
  const cycleBars: BarDatum[] = cycles.map((cycle) => ({ label: cycle.label.charAt(0).toUpperCase() + cycle.label.slice(1), value: cycle.value }));
  const pages = [...usage.pages].sort((a, b) => b.views - a.views);
  const downloads = [...usage.downloads].sort((a, b) => b.downloads - a.downloads);

  return <div className="space-y-6">
    <header><p className="label text-xs tracking-[0.18em] text-muted">UTILISATION</p><h1 className="font-title mt-2 text-[30px] leading-tight text-foreground sm:text-[38px]">Est-ce que les membres utilisent réellement la plateforme&nbsp;?</h1></header>
    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4"><Kpi value={total} label="Comptes" detail="Comptes réels, hors comptes de test" /><Kpi value={currentCycle?.value ?? 0} label="Nouveaux comptes du cycle" detail={currentCycle ? `Cycle se terminant en ${currentCycle.label}` : undefined} /><Kpi value={activeThisMonth} label="Utilisateurs actifs ce mois-ci" detail="Personnes uniques" /><Kpi value={`${activityRate} %`} label="Taux d’activité" detail={`${activeThisMonth} utilisateurs sur ${total} comptes`} /></section>
    <BarChart title="Utilisateurs actifs par semaine" subtitle={`Personnes uniques ayant utilisé la plateforme. Données disponibles depuis le ${TRACKING_START}.`} data={weekly} />
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <BarChart title="Création de comptes" subtitle="Nouveaux comptes par cycle, selon les dates réelles des journées Ministry School." data={cycleBars} />
      <Panel title="Pages les plus consultées" subtitle={`Classement depuis le ${TRACKING_START}. Les pages techniques sont exclues.`}>{pages.length ? <ol className="divide-y divide-border-soft">{pages.map((page, index) => <li key={page.page_key} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 py-3 first:pt-0"><span className="font-title text-lg text-muted">{index + 1}</span><span className="text-sm font-medium text-foreground">{pageLabels[page.page_key] ?? page.page_key}</span><span className="text-right text-sm tabular-nums text-foreground"><strong>{page.views}</strong> vues<span className="block text-xs font-normal text-muted">{page.unique_users} personnes</span></span></li>)}</ol> : <p className="text-sm text-muted">La collecte vient de commencer. Les premières consultations apparaîtront ici.</p>}</Panel>
      <Panel title="État des comptes" subtitle="Les libellés distinguent les accès administratifs de l’utilisation réelle."><ProportionRows total={total} rows={[{ label: "Jamais connectés", value: usage.accounts.never_signed_in, color: "#df4b57" }, { label: `Utilisateurs observés depuis le ${TRACKING_START}`, value: usage.accounts.observed_since_tracking, color: "#00a6a6" }, { label: "Comptes désactivés", value: usage.accounts.disabled_accounts, color: "#6f7774" }]} /></Panel>
      <Panel title="Documents les plus téléchargés" subtitle={`Demandes d’ouverture comptabilisées depuis le ${TRACKING_START}.`}><DownloadTable downloads={downloads} /></Panel>
    </div>
  </div>;
}

function DownloadTable({ downloads }: { downloads: UsageAnalytics["downloads"] }) {
  const [expanded, setExpanded] = useState(false);
  const downloaded = downloads.filter((item) => item.downloads > 0);
  const shown = expanded ? downloaded : downloaded.slice(0, 5);
  return <>{shown.length ? <><ol className="divide-y divide-border-soft sm:hidden">{shown.map((item, index) => <li key={item.material_id} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2.5 py-3 first:pt-0"><span className="font-title text-base text-muted">{index + 1}</span><span className="min-w-0"><strong className="block truncate text-[13px] text-foreground">{item.document_title}</strong><span className="block truncate text-xs text-muted">{item.course_title}</span></span><span className="text-sm font-semibold tabular-nums text-foreground">{item.downloads}</span></li>)}</ol><div className="hidden sm:block"><table className="w-full text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wider text-muted"><tr><th className="pb-3 font-medium">Document</th><th className="pb-3 font-medium">Cours</th><th className="pb-3 text-right font-medium">Téléchargements</th></tr></thead><tbody className="divide-y divide-border-soft">{shown.map((item) => <tr key={item.material_id}><td className="py-3 pr-4 font-medium text-foreground">{item.document_title}</td><td className="py-3 pr-4 text-muted">{item.course_title}</td><td className="py-3 text-right font-semibold tabular-nums text-foreground">{item.downloads}</td></tr>)}</tbody></table></div></> : <p className="text-sm text-muted">Aucun téléchargement enregistré depuis le début du suivi.</p>}{downloaded.length > 5 && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-4 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-foreground">{expanded ? "Réduire" : "Voir plus"}<ChevronDown size={15} className={expanded ? "rotate-180" : ""} /></button>}</>;
}

type MemberFilters = { sens: string; gender: string; implication: string; status: string; role: string };
const DEFAULT_FILTERS: MemberFilters = { sens: "toutes", gender: "tous", implication: "toutes", status: "tous", role: "tous" };
const compactFilter = "h-9 rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none transition hover:border-foreground/30 focus:border-foreground";
const filterValueLabels: Record<string, string> = { femme: "Femmes", homme: "Hommes", a_decouvrir: "Sensibilité à découvrir", manager: "Managers", collaborator: "Collaborateurs", equipier: "Équipiers MLK", none: "Pas encore engagé", unknown: "À renseigner", actif: "Accès validé", a_confirmer: "À confirmer", desactive: "Désactivé", student: "Étudiants", admin: "Admins" };
const genderOptions = [{value:"tous",label:"Tous les genres"},{value:"femme",label:"Femmes"},{value:"homme",label:"Hommes"}];
const involvementOptions = [{value:"toutes",label:"Toutes les implications"},{value:"manager",label:"Managers"},{value:"collaborator",label:"Collaborateurs"},{value:"equipier",label:"Équipiers MLK"},{value:"none",label:"Pas encore engagé"},{value:"unknown",label:"À renseigner"}];
const memberStatusOptions = [{value:"tous",label:"Tous les statuts"},{value:"actif",label:"Accès validé"},{value:"a_confirmer",label:"À confirmer"},{value:"desactive",label:"Désactivé"}];
const memberRoleOptions = [{value:"tous",label:"Tous les rôles"},{value:"student",label:"Étudiants"},{value:"admin",label:"Admins"}];

function MembersSection({ members, ministries }: { members: Member[]; ministries: Ministry[] }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [advanced, setAdvanced] = useState(false);
  const ministryById = useMemo(() => new Map(ministries.map((item) => [item.id, item])), [ministries]);
  const filtered = members.filter((member) => {
    const engagement = parseMlkEngagement(member.notification_prefs);
    const ministry = ministryById.get(member.ministry_id ?? "");
    if (filters.sens !== "toutes" && (filters.sens === "a_decouvrir" ? !!member.ministry_id : ministry?.slug !== filters.sens)) return false;
    if (filters.gender !== "tous" && member.gender !== filters.gender) return false;
    if (filters.status !== "tous" && memberStatus(member) !== filters.status) return false;
    if (filters.role !== "tous" && (filters.role === "student" ? member.role !== "student" : member.role !== filters.role)) return false;
    if (filters.implication !== "toutes") {
      const key = engagement.manager ? "manager" : engagement.collaborator ? "collaborator" : engagement.equipier ? "equipier" : engagement.none ? "none" : "unknown";
      if (key !== filters.implication) return false;
    }
    return true;
  });
  const total = filtered.length;
  const women = filtered.filter((member) => member.gender === "femme").length;
  const men = filtered.filter((member) => member.gender === "homme").length;
  const filled = filtered.filter((member) => member.ministry_id).length;
  const undiscovered = total - filled;
  const sensitivityRows = ministries.map((ministry) => ({ label: sensitivityLabels[ministry.slug] ?? ministry.name, value: filtered.filter((member) => member.ministry_id === ministry.id).length, color: getMinistry(ministry.slug)?.color }));
  const engagements = filtered.map((member) => parseMlkEngagement(member.notification_prefs));
  const involvementRows = [{ label: "Managers et responsables adjoints", value: engagements.filter((item) => item.manager).length }, { label: "Collaborateurs salariés", value: engagements.filter((item) => item.collaborator).length }, { label: "Équipiers MLK", value: engagements.filter((item) => item.equipier).length }, { label: "Pas encore engagé dans une équipe", value: engagements.filter((item) => item.none).length }, { label: "Implication à renseigner", value: engagements.filter((item) => !item.completed).length }];
  const activeFilters = Object.entries(filters).filter(([key, value]) => value !== DEFAULT_FILTERS[key as keyof MemberFilters]);
  const set = (key: keyof MemberFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return <div className="space-y-6">
    <header><p className="label text-xs tracking-[0.18em] text-muted">MEMBRES</p><h1 className="font-title mt-2 text-[30px] leading-tight text-foreground sm:text-[38px]">Qui compose Ministry School&nbsp;?</h1></header>
    <div className="border-b border-border-soft pb-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="label mr-1 hidden text-[10px] tracking-[0.16em] text-muted sm:inline">AFFINER</span>
        <AdminSelect value={filters.sens} onValueChange={(value) => set("sens", value)} options={[{value:"toutes",label:"Toutes les sensibilités"},...ministries.map((item) => ({value:item.slug,label:item.name})),{value:"a_decouvrir",label:"Sensibilité à découvrir"}]} className="hidden min-w-[190px] sm:block" ariaLabel="Sensibilité" searchable />
        <AdminSelect value={filters.gender} onValueChange={(value) => set("gender", value)} options={genderOptions} className="hidden min-w-[155px] sm:block" ariaLabel="Genre" />
        <button type="button" onClick={() => setAdvanced((value) => !value)} aria-expanded={advanced} className={`${compactFilter} inline-flex w-full items-center justify-center gap-2 font-medium sm:w-auto`}><SlidersHorizontal size={14} /> Filtres{activeFilters.length ? ` · ${activeFilters.length}` : ""}</button>
      </div>
      {advanced && <div className="fixed inset-x-0 bottom-0 z-50 grid max-h-[85dvh] gap-3 overflow-y-auto rounded-t-2xl border-t border-border bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:static sm:mt-3 sm:max-w-3xl sm:grid-cols-3 sm:overflow-visible sm:rounded-lg sm:border-0 sm:bg-surface/60 sm:p-3 sm:shadow-none">
        <div className="mb-1 flex items-center justify-between sm:hidden"><strong className="font-title text-xl">Filtres</strong><button type="button" onClick={() => setAdvanced(false)} className="grid h-10 w-10 place-items-center rounded-full bg-surface" aria-label="Fermer les filtres"><X size={18} /></button></div>
        <AdminSelect value={filters.sens} onValueChange={(value) => set("sens", value)} options={[{value:"toutes",label:"Toutes les sensibilités"},...ministries.map((item) => ({value:item.slug,label:item.name})),{value:"a_decouvrir",label:"Sensibilité à découvrir"}]} className="sm:hidden" ariaLabel="Sensibilité" searchable />
        <AdminSelect value={filters.gender} onValueChange={(value) => set("gender", value)} options={genderOptions} className="sm:hidden" ariaLabel="Genre" />
        <AdminSelect value={filters.implication} onValueChange={(value) => set("implication", value)} options={involvementOptions} ariaLabel="Implication" />
        <AdminSelect value={filters.status} onValueChange={(value) => set("status", value)} options={memberStatusOptions} ariaLabel="Statut" />
        <AdminSelect value={filters.role} onValueChange={(value) => set("role", value)} options={memberRoleOptions} ariaLabel="Rôle" />
      </div>}
      {activeFilters.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">{activeFilters.map(([key, value]) => <button key={key} type="button" onClick={() => set(key as keyof MemberFilters, DEFAULT_FILTERS[key as keyof MemberFilters])} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-border-soft">{filterValueLabels[value] ?? ministries.find((item) => item.slug === value)?.name ?? value}<X size={11} /></button>)}<button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="ml-1 text-[11px] text-muted underline underline-offset-4">Tout effacer</button></div>}
    </div>
    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4"><Kpi value={total} label="Membres" detail={activeFilters.length ? "Selon les filtres actifs" : undefined} /><Kpi value={`${women} / ${men}`} label="Femmes / Hommes" /><Kpi value={filled} label="Sensibilités renseignées" /><Kpi value={undiscovered} label="Sensibilité à découvrir" /></section>
    <Panel title="Sensibilités ministérielles" subtitle={`Répartition parmi les ${filled} membres ayant renseigné une sensibilité. Les ${undiscovered} sensibilités à découvrir sont présentées séparément.`}><ProportionRows rows={sensitivityRows} total={filled} /></Panel>
    <div className="grid items-start gap-6 xl:grid-cols-2"><Panel title="Genre"><ProportionRows total={total} rows={[{ label: "Femmes", value: women, color: "#6657a5" }, { label: "Hommes", value: men, color: "#147fba" }]} /></Panel><Panel title="Implication" subtitle="Formes d’engagement déclarées dans les profils."><ProportionRows total={total} rows={involvementRows} /></Panel></div>
  </div>;
}

function ProgramSection({ program, downloads }: { program: ProgramAnalytics; downloads: UsageAnalytics["downloads"] }) {
  const hours: BarDatum[] = program.tracks.map((track) => ({ label: track.label, value: Number(track.hours.toFixed(1)), color: sessionColor(track.label, "commun", "var(--foreground)") }));
  return <div className="space-y-6"><header><p className="label text-xs tracking-[0.18em] text-muted">PROGRAMMES</p><h1 className="font-title mt-2 text-[30px] leading-tight text-foreground sm:text-[38px]">Qu’est-ce que Ministry School délivre concrètement&nbsp;?</h1></header><section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4"><Kpi value={program.courseCount} label="Cours" /><Kpi value={program.trainerCount} label="Intervenants" detail="Personnes uniques" /><Kpi value={`${Number(program.hours.toFixed(1))} h`} label="Formation proposée" /><Kpi value={program.resourceCount} label="Ressources pédagogiques" /></section><BarChart title="Heures de formation par parcours" subtitle="Volume programmé à partir des horaires réels des cours." data={hours} unit=" h" /><Panel title="Détail par parcours"><div className="space-y-3 sm:hidden">{program.tracks.map((track) => <article key={track.label} className="rounded-lg bg-surface p-3.5"><h3 className="text-sm font-semibold text-foreground">{track.label}</h3><dl className="mt-3 grid grid-cols-4 gap-2 text-center"><div><dt className="text-[10px] text-muted">Cours</dt><dd className="mt-1 font-semibold tabular-nums">{track.courses}</dd></div><div><dt className="text-[10px] text-muted">Intervenants</dt><dd className="mt-1 font-semibold tabular-nums">{track.trainers}</dd></div><div><dt className="text-[10px] text-muted">Heures</dt><dd className="mt-1 font-semibold tabular-nums">{Number(track.hours.toFixed(1))} h</dd></div><div><dt className="text-[10px] text-muted">Ressources</dt><dd className="mt-1 font-semibold tabular-nums">{track.resources}</dd></div></dl></article>)}</div><div className="hidden sm:block"><table className="w-full text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wider text-muted"><tr><th className="pb-3 font-medium">Parcours</th><th className="pb-3 text-right font-medium">Cours</th><th className="pb-3 text-right font-medium">Intervenants</th><th className="pb-3 text-right font-medium">Heures</th><th className="pb-3 text-right font-medium">Ressources</th></tr></thead><tbody className="divide-y divide-border-soft">{program.tracks.map((track) => <tr key={track.label}><td className="py-3 font-medium text-foreground">{track.label}</td><td className="py-3 text-right tabular-nums">{track.courses}</td><td className="py-3 text-right tabular-nums">{track.trainers}</td><td className="py-3 text-right tabular-nums">{Number(track.hours.toFixed(1))} h</td><td className="py-3 text-right tabular-nums">{track.resources}</td></tr>)}</tbody></table></div></Panel><div className="grid items-start gap-6 xl:grid-cols-[1fr_2fr]"><Panel title="Ressources"><div className="grid grid-cols-2 gap-4"><div><p className="font-title text-3xl">{program.resourceCount}</p><p className="mt-1 text-xs text-muted">ressources proposées</p></div><div><p className="font-title text-3xl">{program.totalDownloads}</p><p className="mt-1 text-xs text-muted">téléchargements suivis</p></div></div><p className="mt-5 text-xs text-muted">Collecte disponible depuis le {TRACKING_START}.</p></Panel><Panel title="Ressources les plus téléchargées"><DownloadTable downloads={downloads} /></Panel></div></div>;
}

const initiativeTypeLabel = {
  project: "Projet",
  training: "Formation",
  both: "Projet et formation",
} as const;

const initiativeStatusLabel: Record<string, string> = {
  draft: "Brouillon",
  unpublished: "Dépublié",
  pending: "À valider",
  changes_requested: "À corriger",
  scheduled: "Programmé",
  published: "Publié",
  past: "Passé",
  archived: "Archivé",
};

function InitiativesSection({ analytics }: { analytics: OpportunityAnalytics }) {
  const fillRate = analytics.capacity ? Math.round(analytics.registrations / analytics.capacity * 100) : 0;
  const active = analytics.published + analytics.scheduled;
  const initiatives = analytics.initiatives.slice(0, 10);
  const statusRows = [
    { label: "Brouillons", value: analytics.draft, color: "#A6ACA9" },
    { label: "En attente de validation", value: analytics.pending, color: "#E9B85D" },
    { label: "À corriger", value: analytics.changesRequested, color: "#D56B62" },
    { label: "Programmés", value: analytics.scheduled, color: "#6B8FD6" },
    { label: "Publiés et à venir", value: analytics.published, color: "#3D9A70" },
    { label: "Passés", value: analytics.past, color: "#5F6764" },
    { label: "Archivés", value: analytics.archived, color: "#2B3130" },
  ];

  return <div className="space-y-6">
    <header>
      <p className="label text-xs tracking-[0.18em] text-muted">PROJETS ET FORMATIONS</p>
      <h1 className="font-title mt-2 text-[30px] leading-tight text-foreground sm:text-[38px]">Quelles initiatives mobilisent réellement la communauté&nbsp;?</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Une lecture commune de l’offre, de son état de publication, des séances proposées et des inscriptions réellement enregistrées.</p>
    </header>

    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
      <Kpi value={analytics.total} label="Initiatives" detail={`${analytics.projects} projets · ${analytics.trainings} formations · ${analytics.combined} mixtes`} />
      <Kpi value={active} label="Visibles ou programmées" detail={`${analytics.published} publiées · ${analytics.scheduled} programmées`} />
      <Kpi value={analytics.registrations} label="Inscriptions aux séances" detail={`${analytics.uniqueParticipants} participants uniques`} />
      <Kpi value={`${fillRate} %`} label="Taux de remplissage" detail={analytics.capacity ? `${analytics.registrations} inscriptions pour ${analytics.capacity} places renseignées` : "Aucune capacité renseignée"} />
    </section>

    <div className="grid items-start gap-6 xl:grid-cols-2">
      <Panel title="Répartition de l’offre" subtitle="Chaque initiative mixte est comptée une seule fois.">
        <ProportionRows total={analytics.total} rows={[
          { label: "Projets", value: analytics.projects, color: "#F2A51A" },
          { label: "Formations", value: analytics.trainings, color: "#E57A23" },
          { label: "Projets et formations", value: analytics.combined, color: "#D65A18" },
        ]} />
      </Panel>
      <Panel title="Cycle de publication" subtitle="Vision exacte des contenus en préparation, en validation, publiés ou terminés.">
        <ProportionRows total={analytics.total} rows={statusRows} />
      </Panel>
    </div>

    <Panel title="Initiatives les plus mobilisatrices" subtitle="Classement par nombre d’inscriptions aux séances, sans confondre une personne inscrite à plusieurs dates.">
      {initiatives.length ? <>
        <div className="space-y-3 lg:hidden">
          {initiatives.map((item) => {
            const rate = item.capacity ? Math.round(item.registrations / item.capacity * 100) : null;
            return <article key={item.id} className="rounded-lg bg-surface p-3.5">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-foreground">{item.title}</h3><p className="mt-1 text-xs text-muted">{initiativeTypeLabel[item.type]} · {initiativeStatusLabel[item.status] ?? item.status}</p></div><strong className="text-lg tabular-nums text-foreground">{item.registrations}</strong></div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center"><div><dt className="text-[10px] text-muted">Séances</dt><dd className="mt-1 font-semibold tabular-nums">{item.sessions}</dd></div><div><dt className="text-[10px] text-muted">Participants</dt><dd className="mt-1 font-semibold tabular-nums">{item.participants}</dd></div><div><dt className="text-[10px] text-muted">Remplissage</dt><dd className="mt-1 font-semibold tabular-nums">{rate === null ? "—" : `${rate} %`}</dd></div></dl>
            </article>;
          })}
        </div>
        <div className="hidden lg:block">
          <table className="w-full table-fixed text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wider text-muted"><tr><th className="w-[34%] pb-3 font-medium">Initiative</th><th className="w-[18%] pb-3 font-medium">État</th><th className="pb-3 text-right font-medium">Séances</th><th className="pb-3 text-right font-medium">Participants</th><th className="pb-3 text-right font-medium">Inscriptions</th><th className="pb-3 text-right font-medium">Remplissage</th></tr></thead><tbody className="divide-y divide-border-soft">{initiatives.map((item) => <tr key={item.id}><td className="py-3 pr-4"><strong className="block break-words text-foreground">{item.title}</strong><span className="text-xs text-muted">{initiativeTypeLabel[item.type]}</span></td><td className="py-3 pr-4 text-muted">{initiativeStatusLabel[item.status] ?? item.status}</td><td className="py-3 text-right tabular-nums">{item.sessions}</td><td className="py-3 text-right tabular-nums">{item.participants}</td><td className="py-3 text-right font-semibold tabular-nums">{item.registrations}</td><td className="py-3 text-right tabular-nums">{item.capacity ? `${Math.round(item.registrations / item.capacity * 100)} %` : "—"}</td></tr>)}</tbody></table>
        </div>
      </> : <p className="text-sm text-muted">Aucune initiative n’est encore enregistrée.</p>}
    </Panel>

    <section className="grid gap-3 sm:grid-cols-3">
      <Kpi value={analytics.sessions} label="Séances proposées" detail={`${analytics.sessionsWithCapacity} avec une capacité renseignée`} />
      <Kpi value={analytics.capacity} label="Places proposées" detail="Somme des capacités de chaque séance" />
      <Kpi value={analytics.resources} label="Supports et ressources" detail="Documents et liens associés aux initiatives" />
    </section>
  </div>;
}

export default function StatisticsTab({ members, ministries, trainingDates, monthlyActivity, usage, program, opportunities, section: requestedSection }: { members: Member[]; ministries: Ministry[]; trainingDates: string[]; monthlyActivity: MonthlyActiveUsers[]; usage: UsageAnalytics; program: ProgramAnalytics; opportunities: OpportunityAnalytics; section: string }) {
  const section: Section = requestedSection === "membres" || requestedSection === "programmes" || requestedSection === "initiatives" ? requestedSection : "utilisation";
  function downloadCsv() {
    const rows = [["Indicateur", "Valeur"], ["Comptes", String(members.length)], ["Utilisateurs actifs ce mois", String(monthlyActivity.find((item) => item.activity_month === currentParisMonth())?.active_users ?? 0)], ["Cours", String(program.courseCount)], ["Intervenants", String(program.trainerCount)], ["Heures", String(program.hours)], ["Ressources pédagogiques", String(program.resourceCount)], ["Projets et formations", String(opportunities.total)], ["Séances de projets et formations", String(opportunities.sessions)], ["Inscriptions aux séances", String(opportunities.registrations)], ["Participants uniques", String(opportunities.uniqueParticipants)], ["Places proposées", String(opportunities.capacity)]];
    const csv = `\ufeff${rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `statistiques-ministry-school-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="space-y-7"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><StatisticsNav section={section} /><button type="button" onClick={downloadCsv} className="inline-flex items-center gap-2 self-start px-2 py-2 text-xs font-medium text-muted hover:text-foreground"><Download size={14} /> Exporter</button></div>{section === "utilisation" && <UsageSection members={members} trainingDates={trainingDates} monthlyActivity={monthlyActivity} usage={usage} />}{section === "membres" && <MembersSection members={members} ministries={ministries} />}{section === "programmes" && <ProgramSection program={program} downloads={usage.downloads} />}{section === "initiatives" && <InitiativesSection analytics={opportunities} />}</div>;
}
