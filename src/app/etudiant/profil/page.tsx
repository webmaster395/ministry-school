import { createClient } from "@/lib/supabase/server";
import ProfileCard from "@/components/ProfileCard";
import ProfileTabs from "@/components/ProfileTabs";
import { getViewer } from "@/lib/data/viewer";
import { isDemoAdminEmail } from "@/lib/demo-admin";
import { parseMlkEngagement } from "@/lib/mlk-engagement";
import MlkEngagementForm from "@/components/MlkEngagementForm";

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, notification_prefs, ministries!profiles_ministry_id_fkey(name)")
      .eq("id", user!.id)
      .single();

  const { data: genderRow } = await supabase.from("profiles").select("gender").eq("id", user!.id).single();

  const rawGender = (genderRow?.gender as string | undefined) ?? (user?.user_metadata?.gender as string | undefined);
  const genderLabel = rawGender === "homme" ? "Homme" : rawGender === "femme" ? "Femme" : null;

  const ministryName = isDemoAdminEmail(user?.email)
    ? undefined
    : (profile?.ministries as unknown as { name: string } | null)?.name;

  const viewer = await getViewer();
  const r = viewer?.roles;
  // Les fonctions de la personne, pour ne pas afficher « Étudiant » à un administrateur
  const functions = [
    r?.admin && "Admin",
    r?.teacher && "Formateur",
    r && r.steeringMinistryIds.length > 0 && "Pilotage",
    r?.serviceLead && "Responsable de service",
    r?.projectLead && "Chef de projet",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
    <ProfileTabs />
    <ProfileCard
      userId={user?.id}
      avatarUrl={viewer?.avatarUrl ?? null}
      fullName={profile?.full_name ?? ""}
      email={user?.email ?? ""}
      phone={
        (user?.user_metadata?.profile_phone as string | undefined) ??
        (user?.user_metadata?.phone as string | undefined) ??
        user?.phone ??
        ""
      }
      roleLabel={functions.length ? functions.join(" · ") : "Étudiant"}
      ministryName={ministryName}
      fields={[
        ...(genderLabel ? [{ label: "Genre", value: genderLabel }] : []),
      ]}
    />
    <section className="rounded-lg border border-border bg-background p-5 sm:p-7">
      <p className="mb-4 text-sm text-muted">Mets à jour les informations utilisées dans les statistiques de la plateforme.</p>
      <MlkEngagementForm initial={parseMlkEngagement(profile?.notification_prefs)} />
    </section>
    </div>
  );
}
