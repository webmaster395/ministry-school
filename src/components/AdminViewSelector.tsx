"use client";

import Link from "next/link";
import { ChevronDown, Eye, RotateCcw, ShieldCheck, UserRound } from "lucide-react";

export default function AdminViewSelector({ firstName, avatarUrl }: { firstName: string; avatarUrl: string | null }) {
  return <details className="group relative hidden sm:block">
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-border py-[5px] pl-2 pr-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
      {avatarUrl ? <>
        {/* eslint-disable-next-line @next/next/no-img-element -- adresse temporaire signée, non optimisable */}
        <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
      </> : <span className="grid h-6 w-6 place-items-center rounded-full bg-surface"><ShieldCheck size={14} /></span>}
      {firstName}<ChevronDown size={14} className="transition group-open:rotate-180" />
    </summary>
    <nav aria-label="Changer de vue" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-background p-2 shadow-xl">
      <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[.14em] text-muted">Changer de vue sans changer de rôle</p>
      <MenuLink href="/gestion/admin" icon={<RotateCcw size={16} />} title="Vue super administrateur" detail="Revenir à l’administration complète" />
      <MenuLink href="/etudiant" icon={<UserRound size={16} />} title="Voir comme étudiant" detail="Votre propre espace étudiant" />
      <MenuLink href="/gestion/admin/previsualisation?vue=responsable" icon={<Eye size={16} />} title="Voir comme responsable" detail="Choisir un périmètre existant" />
      <MenuLink href="/gestion/admin/previsualisation?vue=contributeur" icon={<Eye size={16} />} title="Voir comme contributeur" detail="Choisir un périmètre existant" />
    </nav>
  </details>;
}

function MenuLink({ href, icon, title, detail }: { href: string; icon: React.ReactNode; title: string; detail: string }) {
  return <Link href={href} className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface"><span className="mt-0.5 text-muted">{icon}</span><span><strong className="block text-sm">{title}</strong><small className="mt-0.5 block text-xs leading-4 text-muted">{detail}</small></span></Link>;
}
