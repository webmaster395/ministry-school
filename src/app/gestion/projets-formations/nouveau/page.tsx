import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import { getProjectsTrainingRights, getServices } from "@/lib/data/opportunities";
import OpportunityCreateForm from "@/components/admin/OpportunityCreateForm";
import { randomUUID } from "node:crypto";
import { getViewer } from "@/lib/data/viewer";

function firstSaturday(year: number, month: number) {
  const date = new Date(Date.UTC(year, month, 1));
  date.setUTCDate(1 + ((6 - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}

export default async function NewProjectsTrainingPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/connexion");
  const [rights, viewer, query] = await Promise.all([getProjectsTrainingRights(supabase, user.id), getViewer(), searchParams]);
  const superAdminView = query.scope === "admin" && !!viewer?.roles.superAdmin;
  if (!superAdminView && !rights.canCreate) redirect("/gestion/projets-formations");
  const [members, services, { data: canManageInternalMaterial }] = await Promise.all([
    superAdminView ? getMembers(supabase) : Promise.resolve([]),
    getServices(supabase),
    supabase.rpc("can_review_editorial_content"),
  ]);
  const now = new Date();
  const schoolYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const suggestedSaturdays = [10, 11, 0, 1, 2, 3, 4, 5].map((month) => firstSaturday(month >= 10 ? schoolYear : schoolYear + 1, month));
  return <div className="space-y-5"><Link href={`/gestion/projets-formations${superAdminView ? "?scope=admin" : ""}`} className="inline-flex items-center gap-1.5 text-sm text-muted"><ChevronLeft size={16} /> Projets et formations</Link><header><p className="label text-xs tracking-[.16em] text-muted">{superAdminView ? "SUPERVISION ADMIN" : "ESPACE OPÉRATIONNEL"}</p><h1 className="font-title mt-1 text-[34px]">Créer un projet ou une formation</h1><p className="mt-1 text-sm text-muted">Une fiche claire, les séances, puis la soumission à la Super administration.</p></header><OpportunityCreateForm creationToken={randomUUID()} members={members.filter((member) => !member.deactivated).map(({ id, full_name, email }) => ({ id, full_name, email }))} services={services} suggestedSaturdays={suggestedSaturdays} canManageInternalMaterial={superAdminView && !!canManageInternalMaterial} canAssignMembers={superAdminView} adminScope={superAdminView} /></div>;
}
