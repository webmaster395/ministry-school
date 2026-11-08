import { createClient } from "@/lib/supabase/server";
import ProfileTabs from "@/components/ProfileTabs";
import CalendarResync from "@/components/CalendarResync";
import { CALENDAR_SYNC_ENABLED } from "@/lib/calendar-sync";
import { createCalendarToken } from "@/lib/calendar-token";

export default async function StudentPreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row } = await supabase.from("profiles").select("calendar_synced_at").eq("id", user!.id).single();

  // Calendrier déjà synchronisé : on propose ici de recommencer (le bouton a disparu de la page Calendrier)
  let resyncUrl: string | null = null;
  if (CALENDAR_SYNC_ENABLED && row?.calendar_synced_at) {
    try {
      resyncUrl = `/agenda/${createCalendarToken(user!.id)}`;
    } catch {
      resyncUrl = null;
    }
  }

  return (
    <div className="space-y-5">
      <ProfileTabs />
      {resyncUrl && <CalendarResync subscribeUrl={resyncUrl} />}
    </div>
  );
}
