import Link from "next/link";
import { BookHeart, ChevronRight, Compass, HeartHandshake } from "lucide-react";
import SuperAdminHeader from "@/components/admin/SuperAdminHeader";

const rows = [
  ["Formation du cœur", "Cours communs, séances, supports et devoirs.", "/gestion/admin?onglet=programme", BookHeart],
  ["Formation du caractère", "Programme, intervenants et contenus pédagogiques.", "/gestion/admin?onglet=programme", HeartHandshake],
  ["Formation par ministère", "Les cours des cinq sensibilités et leur état éditorial.", "/gestion/super-admin/ministeres", Compass],
] as const;

export default function SuperAdminCoursesPage() {
  return <div className="space-y-6"><SuperAdminHeader title="Cours et formations" subtitle="Consultez le programme complet, puis ouvrez uniquement les éléments que vous souhaitez modifier." /><section className="overflow-hidden rounded-2xl border border-border bg-background">{rows.map(([title, description, href, Icon]) => <Link key={title} href={href} className="group flex items-center gap-4 border-b border-border-soft px-5 py-5 last:border-0 hover:bg-surface sm:px-6"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface"><Icon size={20} /></span><span className="min-w-0 flex-1"><strong className="font-title block text-[20px] text-foreground">{title}</strong><span className="mt-1 block text-sm text-muted">{description}</span></span><ChevronRight size={18} className="text-muted transition group-hover:translate-x-0.5" /></Link>)}</section></div>;
}
