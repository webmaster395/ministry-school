import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { getTeacherPrepSessions } from "@/lib/data/pilotage";
import CommunicationForm, { type CommunicationOption } from "@/components/gestion/CommunicationForm";
import { deleteCommunication } from "./actions";

type Sent = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  sent_as: string | null;
  ministries: { name: string } | null;
  sessions: { description: string | null; session_date: string } | null;
  opportunities: { title: string } | null;
  author: { full_name: string } | null;
};

const AS_LABEL: Record<string, string> = {
  admin: "Admin",
  teacher: "Formateur",
  steering: "Pilotage ministériel",
  service: "Responsable de service",
  project: "Chef de projet",
};

const fmt = (v: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(v));
const dayLabel = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(`${d}T00:00:00`));

export default async function CommunicationPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const r = viewer.roles;
  const hasFunction = r.admin || r.teacher || r.steeringMinistryIds.length > 0 || r.serviceLead || r.projectLead;
  if (!hasFunction) redirect("/etudiant");

  const supabase = await createClient();
  const options: CommunicationOption[] = [];

  if (r.admin) {
    const { data: ministries } = await supabase.from("ministries").select("id, name").order("name");
    options.push({
      as: "admin",
      label: "Admin",
      targetLabel: "Destinataires",
      targets: [
        { value: "all", label: "Toute la promotion (tous les étudiants)" },
        ...(ministries ?? []).map((m) => ({ value: `ministry:${m.id}`, label: `Ministère · ${m.name}` })),
      ],
    });
  }

  if (r.teacher) {
    const sessions = await getTeacherPrepSessions(supabase, viewer.id);
    options.push({
      as: "teacher",
      label: "Formateur",
      targetLabel: "Votre cours",
      targets: sessions.map((s) => ({ value: `session:${s.id}`, label: `${dayLabel(s.session_date)} · ${s.description ?? "Cours"}` })),
    });
  }

  if (r.steeringMinistryIds.length > 0) {
    const { data: ministries } = await supabase.from("ministries").select("id, name").in("id", r.steeringMinistryIds).order("name");
    options.push({
      as: "steering",
      label: "Pilotage ministériel",
      targetLabel: "Votre ministère",
      targets: (ministries ?? []).map((m) => ({ value: `ministry:${m.id}`, label: m.name })),
    });
  }

  const mine = async (kind: "formation" | "projet") => {
    const { data } = await supabase
      .from("opportunities")
      .select("id, title")
      .eq("kind", kind)
      .or(`created_by.eq.${viewer.id},lead_id.eq.${viewer.id}`)
      .order("title");
    return (data ?? []).map((o) => ({ value: `opportunity:${o.id}`, label: o.title as string }));
  };
  if (r.serviceLead) options.push({ as: "service", label: "Responsable de service", targetLabel: "Votre formation", targets: await mine("formation") });
  if (r.projectLead) options.push({ as: "project", label: "Chef de projet", targetLabel: "Votre projet", targets: await mine("projet") });

  // Les messages envoyés : les siens, et tous pour un Admin
  let query = supabase
    .from("announcements")
    .select(
      "id, title, body, created_at, author_id, sent_as, ministries(name), sessions(description, session_date), opportunities(title), author:profiles!announcements_author_id_fkey(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (!r.admin) query = query.eq("author_id", viewer.id);
  const { data } = await query;
  const sent = (data ?? []) as unknown as Sent[];

  const targetOf = (a: Sent) =>
    a.opportunities?.title ??
    (a.sessions ? `${dayLabel(a.sessions.session_date)} · ${a.sessions.description ?? "Cours"}` : null) ??
    (a.ministries ? `Ministère · ${a.ministries.name}` : "Toute la promotion");

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
        <h2 className="font-title text-[22px] leading-tight text-foreground">Envoyer un message</h2>
        <p className="mb-5 mt-1 text-[15px] text-muted">
          Le message apparaît directement dans la messagerie des étudiants concernés. Aucun e-mail n&apos;est envoyé.
        </p>
        <CommunicationForm options={options} />
      </section>

      <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
        <h2 className="font-title text-[22px] leading-tight text-foreground">Messages envoyés</h2>
        {sent.length ? (
          <ul className="mt-4 space-y-3">
            {sent.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-foreground">{a.title}</p>
                  <span className="flex items-center gap-3 text-xs text-muted">
                    {fmt(a.created_at)}
                    {a.author_id === viewer.id && (
                      <form action={deleteCommunication}>
                        <input type="hidden" name="announcement_id" value={a.id} />
                        <button type="submit" className="text-link transition hover:underline">Supprimer</button>
                      </form>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {targetOf(a)}
                  {a.sent_as && AS_LABEL[a.sent_as] ? ` · en tant que ${AS_LABEL[a.sent_as]}` : ""}
                  {a.author?.full_name ? ` · ${a.author.full_name}` : ""}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground">{a.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[15px] text-muted">Aucun message envoyé pour le moment.</p>
        )}
      </section>
    </div>
  );
}
