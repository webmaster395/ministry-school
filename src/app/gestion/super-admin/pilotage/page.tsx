import Link from "next/link";
import { BarChart3, CalendarDays, ChevronRight, LayoutDashboard } from "lucide-react";
import SuperAdminHeader from "@/components/admin/SuperAdminHeader";

const links = [
  ["Vue d’ensemble", "Indicateurs principaux de la plateforme.", "/gestion/admin?onglet=vue", LayoutDashboard],
  ["Statistiques", "Engagement, membres, programme et initiatives.", "/gestion/admin?onglet=statistiques", BarChart3],
  ["Programme", "Cours, journées, horaires, salles et intervenants.", "/gestion/admin?onglet=programme", CalendarDays],
] as const;

export default function SuperAdminGlobalPage() {
  return <div className="space-y-6"><SuperAdminHeader title="Pilotage global" subtitle="Les outils transversaux de suivi et d’organisation, sans mélanger les espaces opérationnels personnels." /><section className="overflow-hidden rounded-2xl border border-border bg-background">{links.map(([title, description, href, Icon]) => <Link key={href} href={href} className="group flex items-center gap-4 border-b border-border-soft px-5 py-5 last:border-0 hover:bg-surface"><span className="grid h-11 w-11 place-items-center rounded-xl bg-surface"><Icon size={20} /></span><span className="min-w-0 flex-1"><strong className="font-title block text-[20px]">{title}</strong><span className="text-sm text-muted">{description}</span></span><ChevronRight size={18} className="text-muted transition group-hover:translate-x-0.5" /></Link>)}</section></div>;
}
