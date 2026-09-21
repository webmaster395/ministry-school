import { createClient } from "@/lib/supabase/server";
import ProfileCard from "@/components/ProfileCard";
import ProfileTabs from "@/components/ProfileTabs";
import { getViewer } from "@/lib/data/viewer";

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, ministries!profiles_ministry_id_fkey(name)")
    .eq("id", user!.id)
    .single();

  const ministryName = (profile?.ministries as unknown as { name: string } | null)?.name;

  const viewer = await getViewer();
  const r = viewer?.roles;
  // Les fonctions de la personne, pour ne pas afficher « Étudiant » à un administrateur
  const functions = [
    r?.admin && "Administrateur",
    r?.teacher && "Enseignant",
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
      roleLabel={functions.length ? functions.join(" · ") : "Étudiant"}
      fields={[
        { label: "Ministère", value: ministryName },
      ]}
    />
    </div>
  );
}
