import Link from "next/link";
import { notFound } from "next/navigation";
import AppsStudioShell, { StudioCard, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import { getViewer } from "@/lib/data/viewer";
import { createServiceClient } from "@/lib/supabase/service";
import AdminInvitationButton from "./AdminInvitationButton";

export const dynamic = "force-dynamic";
const date = (value: string | null) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const profileLabels: Record<string, string> = { D: "Conquérant", I: "Communicant", S: "Facilitateur", C: "Analyste", conquerant: "Conquérant", communiquant: "Communicant", facilitateur: "Facilitateur", analyste: "Analyste" };

export default async function MappInvitationsAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; origin?: string; status?: string }> }) {
  const filters = await searchParams;
  const viewer = await getViewer(); if (!viewer?.roles.superAdmin) notFound();
  const mapp = createServiceClient().schema("mapp");
  const { data: invitations } = await mapp.from("invitations").select("id,inviter_user_id,invitation_kind,attempt_id,guest_gender,guest_first_name,guest_last_name,guest_email,belongs_to_church,church_name,created_at,started_at").order("created_at", { ascending: false });
  const inviterIds = [...new Set((invitations ?? []).flatMap((item) => item.inviter_user_id ? [item.inviter_user_id] : []))];
  const { data: inviters } = inviterIds.length ? await createServiceClient().from("profiles").select("id,full_name").in("id", inviterIds) : { data: [] };
  const inviterById = new Map((inviters ?? []).map((item) => [item.id, item.full_name]));
  const attemptIds = (invitations ?? []).flatMap((item) => item.attempt_id ? [item.attempt_id] : []);
  const { data: attempts } = attemptIds.length ? await mapp.from("attempts").select("id,status,completed_at").in("id", attemptIds) : { data: [] };
  const { data: revisions } = attemptIds.length ? await mapp.from("result_revisions").select("id,attempt_id,revision").in("attempt_id", attemptIds).order("revision", { ascending: false }) : { data: [] };
  const latestRevision = new Map<string,string>(); for (const revision of revisions ?? []) if (!latestRevision.has(revision.attempt_id)) latestRevision.set(revision.attempt_id, revision.id);
  const revisionIds = [...latestRevision.values()];
  const { data: rankings } = revisionIds.length ? await mapp.from("result_rankings").select("result_revision_id,context,primary_code,secondary_code,tie_break_required").in("result_revision_id", revisionIds).eq("context", "natural") : { data: [] };
  const attemptById = new Map((attempts ?? []).map((item) => [item.id, item])); const rankingByRevision = new Map((rankings ?? []).map((item) => [item.result_revision_id, item]));
  const total = invitations?.length ?? 0; const started = (invitations ?? []).filter((item) => item.attempt_id).length; const completed = (invitations ?? []).filter((item) => item.attempt_id && attemptById.get(item.attempt_id)?.completed_at).length;
  const women = (invitations ?? []).filter((item) => item.guest_gender === "female").length; const men = (invitations ?? []).filter((item) => item.guest_gender === "male").length;
  const churchMembers = (invitations ?? []).filter((item) => item.belongs_to_church).length;
  const profileCounts = (rankings ?? []).reduce<Record<string, number>>((counts, ranking) => {
    if (ranking.primary_code) counts[ranking.primary_code] = (counts[ranking.primary_code] ?? 0) + 1;
    return counts;
  }, {});
  const q = filters.q?.trim().toLowerCase() ?? "";
  const visibleInvitations = (invitations ?? []).filter((invitation) => {
    const attempt = invitation.attempt_id ? attemptById.get(invitation.attempt_id) : null;
    const revisionId = invitation.attempt_id ? latestRevision.get(invitation.attempt_id) : null;
    const ranking = revisionId ? rankingByRevision.get(revisionId) : null;
    const status = ranking?.tie_break_required && !ranking.primary_code ? "tie" : attempt?.completed_at ? "completed" : invitation.attempt_id ? "started" : "created";
    const haystack = [invitation.guest_first_name, invitation.guest_last_name, invitation.guest_email, invitation.church_name, invitation.inviter_user_id ? inviterById.get(invitation.inviter_user_id) : null].filter(Boolean).join(" ").toLowerCase();
    return (!q || haystack.includes(q)) && (!filters.origin || invitation.invitation_kind === filters.origin) && (!filters.status || status === filters.status);
  });
  return <AppsStudioShell active="results" appTab="results" appSlug="profil-mapp" appName="Profil MAPP" appIconUrl="/apps/profil-mapp/icon.svg" hasResults hasEditor={false}>
    <StudioPageHeader eyebrow="PROFIL MAPP" title="Invitations MAPP" description="Invitations personnelles et liens administrateur, participants et résultats dans une vue unique." action={<Link href="/admin/apps/profil-mapp/results" className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold">Résultats MAPP</Link>} />
    <StudioCard><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-title text-2xl">Lien public secret administrateur</h2><p className="mt-1 text-sm text-muted">Hors quota étudiant. Chaque lien reste personnel et à usage unique.</p></div><AdminInvitationButton /></div></StudioCard>
    <div className="grid gap-4 md:grid-cols-5"><StudioCard><strong className="text-3xl">{total}</strong><p className="text-sm text-muted">Invitations</p></StudioCard><StudioCard><strong className="text-3xl">{started}</strong><p className="text-sm text-muted">Tests commencés</p></StudioCard><StudioCard><strong className="text-3xl">{completed}</strong><p className="text-sm text-muted">Tests terminés · {started ? Math.round(completed / started * 100) : 0} %</p></StudioCard><StudioCard><strong className="text-3xl">{women} / {men}</strong><p className="text-sm text-muted">Femmes / Hommes</p></StudioCard><StudioCard><strong className="text-3xl">{churchMembers}</strong><p className="text-sm text-muted">Personnes en église</p></StudioCard></div>
    <StudioCard><div className="flex flex-wrap gap-5">{["D","I","S","C"].map((code) => <div key={code}><strong className="text-2xl">{profileCounts[code] ?? 0}</strong><p className="text-sm text-muted">{profileLabels[code]}</p></div>)}</div></StudioCard>
    <StudioCard><form className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"><input name="q" defaultValue={filters.q} placeholder="Rechercher un invité, une église ou un étudiant" className="min-h-11 rounded-xl border border-border px-4 text-sm" /><select name="origin" defaultValue={filters.origin} className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"><option value="">Toutes les origines</option><option value="student">Invitations étudiantes</option><option value="admin">Liens administrateur</option></select><select name="status" defaultValue={filters.status} className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"><option value="">Tous les statuts</option><option value="created">Lien créé</option><option value="started">Commencé</option><option value="tie">Départage requis</option><option value="completed">Terminé</option></select><button className="min-h-11 rounded-xl bg-[#27302f] px-5 text-sm font-semibold text-white">Filtrer</button></form></StudioCard>
    <StudioCard><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead><tr className="border-b border-border text-muted"><th className="p-3">Invité</th><th className="p-3">Origine</th><th className="p-3">Église</th><th className="p-3">Créée le</th><th className="p-3">Début</th><th className="p-3">Statut</th><th className="p-3">Profil principal</th><th className="p-3">Profil secondaire</th><th className="p-3">Résultat</th></tr></thead><tbody>{visibleInvitations.map((invitation) => {
      const attempt = invitation.attempt_id ? attemptById.get(invitation.attempt_id) : null; const revisionId = invitation.attempt_id ? latestRevision.get(invitation.attempt_id) : null; const ranking = revisionId ? rankingByRevision.get(revisionId) : null;
      const status = ranking?.tie_break_required && !ranking.primary_code ? "Départage requis" : attempt?.completed_at ? "Terminé" : invitation.attempt_id ? "Commencé" : "Lien créé";
      return <tr key={invitation.id} className="border-b border-border/70"><td className="p-3"><strong className="block">{[invitation.guest_first_name, invitation.guest_last_name].filter(Boolean).join(" ") || "Pas encore renseigné"}</strong><span className="text-xs text-muted">{invitation.guest_email || "—"}</span></td><td className="p-3"><span className="block">{invitation.invitation_kind === "admin" ? "Lien administrateur" : "Invitation étudiante"}</span><small className="text-muted">{invitation.inviter_user_id ? inviterById.get(invitation.inviter_user_id) ?? "Compte étudiant" : "—"}</small></td><td className="p-3">{invitation.belongs_to_church ? invitation.church_name || "Oui" : invitation.started_at ? "Non" : "—"}</td><td className="p-3">{date(invitation.created_at)}</td><td className="p-3">{date(invitation.started_at)}</td><td className="p-3 font-semibold">{status}</td><td className="p-3">{ranking?.primary_code ? profileLabels[ranking.primary_code] ?? "Profil calculé" : ranking?.tie_break_required ? "À départager" : "—"}</td><td className="p-3">{ranking?.secondary_code ? profileLabels[ranking.secondary_code] ?? "Profil calculé" : ranking?.tie_break_required ? "À départager" : "—"}</td><td className="p-3">{invitation.attempt_id && attempt?.completed_at ? <Link href={`/admin/apps/profil-mapp/results/${invitation.attempt_id}`} className="font-semibold underline underline-offset-4">Ouvrir</Link> : "—"}</td></tr>;
    })}</tbody></table></div></StudioCard>
  </AppsStudioShell>;
}
