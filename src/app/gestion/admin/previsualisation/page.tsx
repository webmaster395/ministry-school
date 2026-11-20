import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";

type ScopeRow = { id: string; title: string; kind: "formation" | "initiative"; role: "responsible" | "contributor" };

export default async function RolePreviewPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) redirect("/etudiant");
  const { vue } = await searchParams;
  const role: ScopeRow["role"] = vue === "contributeur" ? "contributor" : "responsible";
  const supabase = await createClient();
  const [formations, initiatives] = await Promise.all([
    supabase.from("formation_assignments").select("role,formation:formations(id,title)").eq("role", role),
    supabase.from("opportunity_assignments").select("responsibility,opportunity:opportunities(id,title)").eq("responsibility", role === "responsible" ? "manager" : "contributor"),
  ]);
  const rows: ScopeRow[] = [
    ...((formations.data ?? []) as unknown as { role: "responsible" | "contributor"; formation: { id: string; title: string } | null }[]).flatMap((row) => row.formation ? [{ id: row.formation.id, title: row.formation.title, kind: "formation" as const, role: row.role }] : []),
    ...((initiatives.data ?? []) as unknown as { responsibility: "manager" | "contributor"; opportunity: { id: string; title: string } | null }[]).flatMap((row) => row.opportunity ? [{ id: row.opportunity.id, title: row.opportunity.title, kind: "initiative" as const, role }] : []),
  ].filter((row, index, all) => all.findIndex((item) => item.id === row.id && item.kind === row.kind) === index);

  return <div className="space-y-6">
    <ManagementPageHeader eyebrow="PRÉVISUALISATION SÉCURISÉE" title={`Vue ${role === "responsible" ? "responsable" : "contributeur"}`} subtitle="Choisissez un périmètre réellement attribué. Votre rôle et votre session ne sont jamais modifiés." mobileTitleInAppBar actions={<Link href="/gestion/admin" className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent">Revenir à l’administration</Link>} />
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong className="inline-flex items-center gap-2"><ShieldCheck size={17} /> Mode prévisualisation</strong><p className="mt-1">Cette vue montre uniquement des périmètres existants. Elle n’usurpe aucun compte et ne modifie aucune permission.</p></div>
    {rows.length ? <div className="grid gap-3 md:grid-cols-2">{rows.map((row) => <Link key={`${row.kind}-${row.id}`} href={row.kind === "formation" ? `/gestion/formations/${row.id}?scope=admin&preview=${role}` : `/gestion/projets-formations/${row.id}?scope=admin&preview=${role}`} className="group rounded-2xl border border-border bg-background p-5 transition hover:border-foreground"><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-muted"><Eye size={15} /> {row.kind === "formation" ? "Formation" : "Projet ou formation"}</span><h2 className="font-title mt-3 text-xl">{row.title}</h2><p className="mt-3 text-sm font-semibold">Ouvrir ce périmètre →</p></Link>)}</div> : <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">Aucun périmètre réel n’est actuellement attribué à ce rôle.</p>}
  </div>;
}
