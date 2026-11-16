import { getViewer } from "@/lib/data/viewer";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const profileLabels: Record<string, string> = { D: "Conquérant", I: "Communicant", S: "Facilitateur", C: "Analyste" };

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) return new Response("Accès refusé", { status: 403 });

  const service = createServiceClient();
  const mapp = service.schema("mapp");
  const { data: invitations, error } = await mapp.from("invitations")
    .select("id,inviter_user_id,invitation_kind,attempt_id,guest_gender,guest_first_name,guest_last_name,guest_email,belongs_to_church,church_name,created_at,started_at")
    .order("created_at", { ascending: false });
  if (error) return new Response("Impossible de préparer l’export.", { status: 500 });

  const inviterIds = [...new Set((invitations ?? []).flatMap((item) => item.inviter_user_id ? [item.inviter_user_id] : []))];
  const attemptIds = (invitations ?? []).flatMap((item) => item.attempt_id ? [item.attempt_id] : []);
  const [{ data: inviters }, { data: attempts }, { data: revisions }] = await Promise.all([
    inviterIds.length ? service.from("profiles").select("id,full_name").in("id", inviterIds) : Promise.resolve({ data: [] }),
    attemptIds.length ? mapp.from("attempts").select("id,status,completed_at").in("id", attemptIds) : Promise.resolve({ data: [] }),
    attemptIds.length ? mapp.from("result_revisions").select("id,attempt_id,revision").in("attempt_id", attemptIds).order("revision", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const latestRevision = new Map<string, string>();
  for (const revision of revisions ?? []) if (!latestRevision.has(revision.attempt_id)) latestRevision.set(revision.attempt_id, revision.id);
  const revisionIds = [...latestRevision.values()];
  const { data: rankings } = revisionIds.length
    ? await mapp.from("result_rankings").select("result_revision_id,context,primary_code,secondary_code,tie_break_required").in("result_revision_id", revisionIds).eq("context", "natural")
    : { data: [] };
  const inviterById = new Map((inviters ?? []).map((item) => [item.id, item.full_name]));
  const attemptById = new Map((attempts ?? []).map((item) => [item.id, item]));
  const rankingByRevision = new Map((rankings ?? []).map((item) => [item.result_revision_id, item]));
  const header = ["Prénom", "Nom", "E-mail", "Genre", "Église", "Nom de l’église", "Origine", "Étudiant invitant", "Invitation créée le", "Test commencé le", "Test terminé le", "Statut", "Profil principal", "Profil secondaire"];
  const rows = (invitations ?? []).map((invitation) => {
    const attempt = invitation.attempt_id ? attemptById.get(invitation.attempt_id) : null;
    const revisionId = invitation.attempt_id ? latestRevision.get(invitation.attempt_id) : null;
    const ranking = revisionId ? rankingByRevision.get(revisionId) : null;
    const status = ranking?.tie_break_required && !ranking.primary_code ? "Départage requis" : attempt?.completed_at ? "Terminé" : invitation.attempt_id ? "Commencé" : "Lien créé";
    return [invitation.guest_first_name, invitation.guest_last_name, invitation.guest_email,
      invitation.guest_gender === "female" ? "Femme" : invitation.guest_gender === "male" ? "Homme" : "",
      invitation.belongs_to_church == null ? "" : invitation.belongs_to_church ? "Oui" : "Non", invitation.church_name,
      invitation.invitation_kind === "admin" ? "Lien administrateur" : "Invitation étudiante",
      invitation.inviter_user_id ? inviterById.get(invitation.inviter_user_id) ?? "Compte étudiant" : "",
      invitation.created_at, invitation.started_at, attempt?.completed_at, status,
      ranking?.primary_code ? profileLabels[ranking.primary_code] ?? "Profil calculé" : "",
      ranking?.secondary_code ? profileLabels[ranking.secondary_code] ?? "Profil calculé" : ""];
  });
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n")}`;
  return new Response(csv, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="invitations-mapp-${new Date().toISOString().slice(0, 10)}.csv"`,
    "Cache-Control": "private, no-store",
  } });
}
