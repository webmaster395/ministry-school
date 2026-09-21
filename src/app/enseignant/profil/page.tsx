import { createClient } from "@/lib/supabase/server";
import ProfileCard from "@/components/ProfileCard";
import { getViewer } from "@/lib/data/viewer";
import { getTeacherSessions } from "@/lib/data/teacher";

export default async function TeacherProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, sessions] = await Promise.all([
    supabase.from("profiles").select("full_name, ministries!profiles_ministry_id_fkey(name)").eq("id", user!.id).single(),
    getTeacherSessions(supabase, user!.id),
  ]);

  const ministryName = (profile?.ministries as unknown as { name: string } | null)?.name;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions.filter((s) => s.session_date >= today).length;

  return (
    <ProfileCard
      userId={user?.id}
      avatarUrl={(await getViewer())?.avatarUrl ?? null}
      fullName={profile?.full_name ?? ""}
      email={user?.email ?? ""}
      roleLabel="Enseignant"
      fields={[
        { label: "Ministère", value: ministryName },
        { label: "Séances assignées", value: String(sessions.length) },
        { label: "Séances à venir", value: String(upcoming) },
      ]}
    />
  );
}
