import { createClient } from "@/lib/supabase/server";
import ProfileCard from "@/components/ProfileCard";
import { getViewer } from "@/lib/data/viewer";

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  return (
    <ProfileCard
      userId={user?.id}
      avatarUrl={(await getViewer())?.avatarUrl ?? null}
      fullName={profile?.full_name ?? ""}
      email={user?.email ?? ""}
      roleLabel="Administrateur"
    />
  );
}
