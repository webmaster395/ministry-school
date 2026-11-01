"use client";

import Link from "next/link";
import { ChevronDown, FolderKanban, GraduationCap, Plus } from "lucide-react";
import CourseCreationDialog from "@/components/gestion/CourseCreationDialog";

const itemClass =
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-foreground transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function PilotageCreateMenu({ ministryId, ministrySlug }: { ministryId: string; ministrySlug: string }) {
  const projectHref = `/gestion/projets-formations/nouveau?source=pilotage&m=${encodeURIComponent(ministrySlug)}&type=projet`;
  const trainingHref = `/gestion/projets-formations/nouveau?source=pilotage&m=${encodeURIComponent(ministrySlug)}&type=formation`;

  return (
    <details className="group relative w-full sm:w-auto">
      <summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-[#1b2221] sm:w-auto [&::-webkit-details-marker]:hidden">
        <Plus size={17} /> Créer
        <ChevronDown size={15} className="transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-background p-2 shadow-[0_18px_48px_rgba(28,34,33,.16)]">
        <CourseCreationDialog
          context="ministry"
          parentId={ministryId}
          triggerLabel="Créer un cours"
          triggerClassName={itemClass}
        />
        <Link href={projectHref} className={itemClass}>
          <FolderKanban size={18} className="text-muted" />
          <span><span className="block">Créer un projet</span><span className="mt-0.5 block text-xs font-normal text-muted">Préparer une proposition puis la soumettre.</span></span>
        </Link>
        <Link href={trainingHref} className={itemClass}>
          <GraduationCap size={18} className="text-muted" />
          <span><span className="block">Créer une formation</span><span className="mt-0.5 block text-xs font-normal text-muted">Ouvrir le formulaire Projets et formations.</span></span>
        </Link>
      </div>
    </details>
  );
}
