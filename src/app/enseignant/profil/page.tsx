import { createClient } from "@/lib/supabase/server";
import ProfileCard from "@/components/ProfileCard";
import { getViewer } from "@/lib/data/viewer";
import { getTeacherSessions } from "@/lib/data/teacher";
import { getServices } from "@/lib/data/opportunities";
import { parseMlkEngagement } from "@/lib/mlk-engagement";
import MlkEngagementForm from "@/components/MlkEngagementForm";

export default async function TeacherProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, sessions, services] = await Promise.all([
    supabase.from("profiles").select("full_name, notification_prefs, ministries!profiles_ministry_id_fkey(name)").eq("id", user!.id).single(),
    getTeacherSessions(supabase, user!.id),
    getServices(supabase),
  ]);

  const ministryName = (profile?.ministries as unknown as { name: string } | null)?.name;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions.filter((s: { session_date: string }) => s.session_date >= today).length;

  return (
    <div className="space-y-5"><ProfileCard
      userId={user?.id}
      avatarUrl={(await getViewer())?.avatarUrl ?? null}
      fullName={profile?.full_name ?? ""}
      email={user?.email ?? ""}
      phone={
        (user?.user_metadata?.profile_phone as string | undefined) ??
        (user?.user_metadata?.phone as string | undefined) ??
        user?.phone ??
        ""
      }
      roleLabel="Formateur"
      ministryName={ministryName}
      fields={[
        { label: "Séances assignées", value: String(sessions.length) },
        { label: "Séances à venir", value: String(upcoming) },
      ]}
    />
    <section className="rounded-lg border border-border bg-background p-5 sm:p-7">
      <MlkEngagementForm services={services} initial={parseMlkEngagement(profile?.notification_prefs)} />
    </section></div>
  );
}
