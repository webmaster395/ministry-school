import { createClient } from "@/lib/supabase/server";
import ProfileTabs from "@/components/ProfileTabs";
import NotificationPrefs from "@/components/NotificationPrefs";
import EnableNotifications from "@/components/EnableNotifications";
import { parseNotificationPrefs } from "@/lib/notification-prefs";

export default async function StudentPreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Requête tolérante : sans la colonne notification_prefs, les réglages par défaut s'appliquent
  const { data: row } = await supabase.from("profiles").select("notification_prefs").eq("id", user!.id).single();

  return (
    <div className="space-y-5">
      <ProfileTabs />
      <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
        <h2 className="font-title text-[22px] leading-tight text-foreground">Communications</h2>
        <p className="mt-1 text-[15px] text-muted">
          <strong className="font-semibold text-foreground">Notifications de l&apos;application</strong>
          <br />
          Recevez les messages et rappels directement sur votre appareil.
        </p>
        <div className="mt-4">
          <EnableNotifications />
        </div>
        <div className="mt-2">
          <NotificationPrefs initial={parseNotificationPrefs(row?.notification_prefs)} />
        </div>
      </section>
    </div>
  );
}
