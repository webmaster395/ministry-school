import { createClient } from "@/lib/supabase/server";
import ProfileCard from "@/components/ProfileCard";
import { getViewer } from "@/lib/data/viewer";
import { getServices } from "@/lib/data/opportunities";
import { parseMlkEngagement } from "@/lib/mlk-engagement";
import MlkEngagementForm from "@/components/MlkEngagementForm";

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, services] = await Promise.all([
    supabase.from("profiles").select("full_name, notification_prefs, ministries!profiles_ministry_id_fkey(name)").eq("id", user!.id).single(),
    getServices(supabase),
  ]);

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
      roleLabel="Administrateur"
      ministryName={(profile?.ministries as unknown as { name: string } | null)?.name}
    />
    <section className="rounded-lg border border-border bg-background p-5 sm:p-7">
      <MlkEngagementForm services={services} initial={parseMlkEngagement(profile?.notification_prefs)} />
    </section></div>
  );
}
