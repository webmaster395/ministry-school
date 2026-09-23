import { createClient } from "@/lib/supabase/server";
import ProfileTabs from "@/components/ProfileTabs";
import { getStudentProfile } from "@/lib/data/student";
import { getStudentMessages } from "@/lib/data/messages";
import { markNotificationsSeen } from "../actions";

const fmt = (v: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(v));

export default async function StudentMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { notificationsSeenAt } = await getStudentProfile(supabase, user!.id);
  const messages = await getStudentMessages(supabase, notificationsSeenAt);
  const newCount = messages.filter((m) => m.isNew).length;

  return (
    <div className="space-y-5">
      <ProfileTabs />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-[560px] text-[15px] text-muted">
          Les messages de vos formateurs et de l&apos;équipe pédagogique.
        </p>
        {newCount > 0 && (
          <form action={markNotificationsSeen}>
            <button
              type="submit"
              className="label rounded-full border border-foreground px-5 py-2.5 text-xs tracking-[0.12em] text-foreground transition hover:bg-surface"
            >
              Tout marquer comme lu ({newCount})
            </button>
          </form>
        )}
      </div>

      {messages.length ? (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg border bg-background p-5 sm:p-6 ${m.isNew ? "border-foreground" : "border-border"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-muted">
                  {m.by ? `De ${m.by}` : "Équipe pédagogique"}
                  {m.isNew && (
                    <span className="label rounded-full bg-m-doctoral/[0.12] px-2.5 py-0.5 text-[10px] tracking-[0.1em] text-link">
                      Nouveau
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted">{fmt(m.at)}</span>
              </div>
              <h2 className="font-title mt-2 text-[22px] leading-tight text-foreground">{m.title}</h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground">{m.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">Aucun message pour le moment.</p>
        </section>
      )}
    </div>
  );
}
