import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Mail, Phone, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { signedAvatarUrls } from "@/lib/avatars";
import { parseMlkEngagement } from "@/lib/mlk-engagement";
import MinistryPicto from "@/components/MinistryPicto";
import { getViewer } from "@/lib/data/viewer";

const date = (value?: string | null) => value
  ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(value))
  : "Non renseignée";
const dateTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(value))
  : "Jamais";

type Assignment = {
  responsibility: "manager" | "contributor";
  opportunity: { title: string; is_project: boolean; is_training: boolean; publication_status: string } | null;
};
type Delegation = { ministry: { name: string } | null };
type Enrollment = { session: { session_date: string; description: string | null; track: string | null; courses: { title: string } | null } | null };
type InitiativeRegistration = { date: { session_date: string; opportunity: { title: string } | null } | null };

export default async function AdminMemberProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) redirect("/gestion/admin");
  const { id } = await params;
  const requestedReturn = (await searchParams).returnTo;
  const returnTo = requestedReturn?.startsWith("/gestion/admin?") || requestedReturn?.startsWith("/gestion/super-admin/membres") || requestedReturn?.startsWith("/gestion/super-admin/roles")
    ? requestedReturn
    : "/gestion/admin?onglet=membres";
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, gender, role, created_at, avatar_path, notification_prefs, preferred_day, email_confirmed, deactivated, is_teacher, is_service_lead, is_project_lead, is_projects_training_member, service_id, ministry_id, ministry_lead_of, ministries!profiles_ministry_id_fkey(name, slug)")
    .eq("id", id)
    .single();
  if (!profile) notFound();

  let email = "";
  let phone = "";
  let lastSignInAt: string | null = null;
  let emailConfirmedAt: string | null = null;
  let assignments: Assignment[] = [];
  let delegations: Delegation[] = [];
  let enrollments: Enrollment[] = [];
  let initiativeRegistrations: InitiativeRegistration[] = [];
  try {
    const service = createServiceClient();
    const [authResult, assignmentsResult, delegationsResult, enrollmentsResult, registrationsResult] = await Promise.all([
      service.auth.admin.getUserById(id),
      service.from("opportunity_assignments").select("responsibility, opportunity:opportunities(title, is_project, is_training, publication_status)").eq("user_id", id),
      service.from("ministry_delegates").select("ministry:ministries(name)").eq("user_id", id),
      service.from("enrollments").select("session:sessions(session_date, description, track, courses(title))").eq("student_id", id),
      service.from("opportunity_date_registrations").select("date:opportunity_dates(session_date, opportunity:opportunities(title))").eq("user_id", id),
    ]);
    const authUser = authResult.data.user;
    email = authUser?.email ?? "";
    phone = String(authUser?.user_metadata?.profile_phone ?? authUser?.user_metadata?.phone ?? authUser?.phone ?? "");
    lastSignInAt = authUser?.last_sign_in_at ?? null;
    emailConfirmedAt = authUser?.email_confirmed_at ?? null;
    assignments = (assignmentsResult.data ?? []) as unknown as Assignment[];
    delegations = (delegationsResult.data ?? []) as unknown as Delegation[];
    enrollments = (enrollmentsResult.data ?? []) as unknown as Enrollment[];
    initiativeRegistrations = (registrationsResult.data ?? []) as unknown as InitiativeRegistration[];
  } catch {
    const { data: emails } = await supabase.rpc("admin_user_emails");
    email = ((emails ?? []) as { id: string; email: string }[]).find((item) => item.id === id)?.email ?? "";
  }

  const [{ data: superAdmin }, { data: service }, { data: leadMinistry }] = await Promise.all([
    supabase.rpc("is_super_admin", { p_user: id }),
    profile.service_id ? supabase.from("services").select("name").eq("id", profile.service_id).maybeSingle() : Promise.resolve({ data: null }),
    profile.ministry_lead_of ? supabase.from("ministries").select("name").eq("id", profile.ministry_lead_of).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const ministry = profile.ministries as unknown as { name: string; slug: string } | null;
  const engagement = parseMlkEngagement(profile.notification_prefs);
  const avatarUrl = profile.avatar_path
    ? (await signedAvatarUrls(supabase, [profile.avatar_path])).get(profile.avatar_path) ?? null
    : null;
  const initials = String(profile.full_name || "?").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const involvement = [
    engagement.none && "Aucun engagement actuellement",
    engagement.equipier && "Équipier MLK",
    engagement.manager && "Manager ou manager adjoint MLK",
    engagement.collaborator && "Collaborateur salarié MLK",
  ].filter(Boolean) as string[];
  const access = [
    superAdmin && "Super administratrice",
    profile.role === "admin" && !superAdmin && "Administrateur",
    leadMinistry?.name && `Responsable · ${leadMinistry.name}`,
    ...delegations.map((item) => item.ministry?.name ? `Contributeur · ${item.ministry.name}` : "Contributeur de ministère"),
    ...assignments.map((item) => `${item.responsibility === "manager" ? "Responsable" : "Contributeur"} · ${item.opportunity?.title ?? "Initiative"}`),
  ].filter(Boolean) as string[];
  const sortedEnrollments = [...enrollments].sort((a, b) => (b.session?.session_date ?? "").localeCompare(a.session?.session_date ?? ""));
  const sortedInitiatives = [...initiativeRegistrations].sort((a, b) => (b.date?.session_date ?? "").localeCompare(a.date?.session_date ?? ""));
  const initiativeNames = new Set(sortedInitiatives.map((item) => item.date?.opportunity?.title).filter(Boolean));

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      <Link href={returnTo} className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground"><ArrowLeft size={17} /> Retour aux membres</Link>

      <section className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex flex-col gap-5 border-b border-border-soft p-5 sm:flex-row sm:items-center sm:p-7">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL Supabase temporaire signée
            <img src={avatarUrl} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" />
          ) : <span className="font-title flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface text-2xl text-foreground">{initials}</span>}
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="label text-[10px] tracking-[0.16em] text-muted">FICHE MEMBRE</p>{profile.deactivated && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-800">Compte désactivé</span>}</div><h1 className="font-title mt-1 text-[30px] leading-tight text-foreground sm:text-[36px]">{profile.full_name || "Sans nom"}</h1><p className="mt-2 text-sm text-muted">{access[0] ?? "Étudiant"}</p></div>
        </div>

        <dl className="grid sm:grid-cols-2 lg:grid-cols-3">
          <Info icon={<Mail size={18} />} label="Adresse e-mail" value={email || "Non renseignée"} />
          <Info icon={<Phone size={18} />} label="Téléphone" value={phone || "Non renseigné"} />
          <Info icon={<UserRound size={18} />} label="Genre" value={profile.gender === "homme" ? "Homme" : profile.gender === "femme" ? "Femme" : "Non renseigné"} />
          <Info icon={<CalendarDays size={18} />} label="Date d’inscription" value={date(profile.created_at)} />
          <Info icon={<Clock3 size={18} />} label="Dernière connexion" value={dateTime(lastSignInAt)} />
          <Info icon={<CheckCircle2 size={18} />} label="Compte" value={profile.deactivated ? "Désactivé" : emailConfirmedAt || profile.email_confirmed ? "Adresse confirmée" : "Confirmation en attente"} />
          <Info icon={<CalendarDays size={18} />} label="Journée préférée" value={profile.preferred_day || "Non renseignée"} />
          <Info icon={<ShieldCheck size={18} />} label="Service rattaché" value={service?.name || "Aucun"} />
          <Info icon={<UsersRound size={18} />} label="Parcours étudiant" value={`${enrollments.length} inscription${enrollments.length > 1 ? "s" : ""} à un cours`} />
        </dl>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-background p-5 sm:p-6"><p className="label text-[11px] tracking-[0.16em] text-muted">SENSIBILITÉ MINISTÉRIELLE</p>{ministry ? <div className="mt-5 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface"><MinistryPicto slug={ministry.slug} size={25} /></span><p className="font-title text-[24px] text-foreground">{ministry.name}</p></div> : <p className="mt-5 text-sm text-muted">Non renseignée</p>}</article>
        <article className="rounded-xl border border-border bg-background p-5 sm:p-6"><p className="label text-[11px] tracking-[0.16em] text-muted">IMPLICATION À MLK</p>{engagement.completed && involvement.length ? <div className="mt-4 space-y-3"><div className="flex flex-wrap gap-2">{involvement.map((item) => <span key={item} className="rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-foreground">{item}</span>)}</div>{engagement.equipierServices && <p className="text-sm text-muted"><strong className="text-foreground">Service(s) comme équipier :</strong> {engagement.equipierServices}</p>}{engagement.managerServices && <p className="text-sm text-muted"><strong className="text-foreground">Service(s) comme manager :</strong> {engagement.managerServices}</p>}</div> : <p className="mt-5 text-sm text-muted">Non renseignée</p>}</article>
      </section>

      <section className="rounded-xl border border-border bg-background p-5 sm:p-6"><p className="label text-[11px] tracking-[0.16em] text-muted">DROITS ET RESPONSABILITÉS</p>{access.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{access.map((item) => <li key={item} className="flex items-center gap-2 rounded-lg bg-surface px-3.5 py-3 text-sm font-medium text-foreground"><ShieldCheck size={16} className="shrink-0 text-muted" />{item}</li>)}</ul> : <p className="mt-4 text-sm text-muted">Aucune responsabilité administrative supplémentaire.</p>}</section>

      <section className="grid gap-5 lg:grid-cols-2">
        <HistoryCard title={`Cours suivis · ${enrollments.length}`} empty="Aucune inscription à un cours." rows={sortedEnrollments.slice(0, 8).map((item) => ({ title: item.session?.courses?.title ?? item.session?.description ?? "Cours", detail: [item.session?.track, date(item.session?.session_date)].filter(Boolean).join(" · ") }))} />
        <HistoryCard title={`Projets et formations · ${initiativeNames.size}`} empty="Aucune inscription à une séance de projet ou formation." rows={sortedInitiatives.slice(0, 8).map((item) => ({ title: item.date?.opportunity?.title ?? "Initiative", detail: date(item.date?.session_date) }))} />
      </section>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex min-w-0 gap-3 border-b border-border-soft p-5 sm:border-r sm:p-6 sm:[&:nth-child(even)]:border-r-0 lg:[&:nth-child(even)]:border-r lg:[&:nth-child(3n)]:border-r-0"><span className="mt-0.5 shrink-0 text-muted">{icon}</span><div className="min-w-0"><dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted">{label}</dt><dd className="mt-1 break-words text-[15px] font-medium text-foreground">{value}</dd></div></div>;
}

function HistoryCard({ title, empty, rows }: { title: string; empty: string; rows: { title: string; detail: string }[] }) {
  return <article className="rounded-xl border border-border bg-background p-5 sm:p-6"><h2 className="font-title text-[22px] text-foreground">{title}</h2>{rows.length ? <ul className="mt-4 divide-y divide-border-soft">{rows.map((row, index) => <li key={`${row.title}-${row.detail}-${index}`} className="py-3 first:pt-0"><p className="text-sm font-semibold text-foreground">{row.title}</p><p className="mt-1 text-xs text-muted">{row.detail}</p></li>)}</ul> : <p className="mt-4 text-sm text-muted">{empty}</p>}</article>;
}
