import { createClient } from "@/lib/supabase/server";
import ProfileCard from "@/components/ProfileCard";

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_day, has_paid, ministries!profiles_ministry_id_fkey(name)")
    .eq("id", user!.id)
    .single();

  const ministryName = (profile?.ministries as unknown as { name: string } | null)?.name;
  const preferredDay = profile?.preferred_day as string | null;

  return (
    <ProfileCard
      fullName={profile?.full_name ?? ""}
      email={user?.email ?? ""}
      roleLabel="Étudiant"
      fields={[
        { label: "Ministère", value: ministryName },
        {
          label: "Jour de cours",
          value: preferredDay ? preferredDay.charAt(0).toUpperCase() + preferredDay.slice(1) : null,
        },
        { label: "Inscription", value: profile?.has_paid ? "Réglée" : "En attente de paiement" },
      ]}
    />
  );
}
