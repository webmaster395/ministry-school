import { createClient } from "@/lib/supabase/server";
import ProfileCard from "@/components/ProfileCard";
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

  return (
    <ProfileCard
      userId={user?.id}
      avatarUrl={(await getViewer())?.avatarUrl ?? null}
      fullName={profile?.full_name ?? ""}
      email={user?.email ?? ""}
      roleLabel="Étudiant"
      fields={[
        { label: "Ministère", value: ministryName },
      ]}
    />
  );
}
