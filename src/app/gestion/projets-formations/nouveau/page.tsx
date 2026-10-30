import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import { getServices } from "@/lib/data/opportunities";
import OpportunityCreateForm from "@/components/admin/OpportunityCreateForm";
import { randomUUID } from "node:crypto";

function firstSaturday(year: number, month: number) {
  const date = new Date(Date.UTC(year, month, 1));
  date.setUTCDate(1 + ((6 - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}

export default async function NewProjectsTrainingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/connexion");
  const { data: superAdmin } = await supabase.rpc("is_super_admin", { p_user: user.id });
  if (!superAdmin) redirect("/gestion/projets-formations");
  const [members, services, { data: canManageInternalMaterial }] = await Promise.all([
    getMembers(supabase),
    getServices(supabase),
    supabase.rpc("can_review_editorial_content"),
  ]);
  const now = new Date();
  const schoolYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const suggestedSaturdays = [10, 11, 0, 1, 2, 3, 4, 5].map((month) => firstSaturday(month >= 10 ? schoolYear : schoolYear + 1, month));
  return <div className="space-y-5"><Link href="/gestion/projets-formations" className="inline-flex items-center gap-1.5 text-sm text-muted"><ChevronLeft size={16} /> Projets et formations</Link><header><h1 className="font-title text-[34px]">Créer un projet ou une formation</h1><p className="mt-1 text-sm text-muted">Une fiche claire, les séances, puis les personnes responsables.</p></header><OpportunityCreateForm creationToken={randomUUID()} members={members.filter((member) => !member.deactivated).map(({ id, full_name, email }) => ({ id, full_name, email }))} services={services} suggestedSaturdays={suggestedSaturdays} canManageInternalMaterial={!!canManageInternalMaterial} /></div>;
}
