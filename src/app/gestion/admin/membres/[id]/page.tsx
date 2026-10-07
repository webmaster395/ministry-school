import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Mail, Phone, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { signedAvatarUrls } from "@/lib/avatars";
import { parseMlkEngagement } from "@/lib/mlk-engagement";
import MinistryPicto from "@/components/MinistryPicto";

const date = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));

export default async function AdminMemberProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const { id } = await params;
  const requestedReturn = (await searchParams).returnTo;
  const returnTo = requestedReturn?.startsWith("/gestion/admin?") ? requestedReturn : "/gestion/admin?onglet=membres";
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, gender, role, created_at, avatar_path, notification_prefs, ministries!profiles_ministry_id_fkey(name, slug)")
    .eq("id", id)
    .single();
  if (!profile) notFound();

  let email = "";
  let phone = "";
  try {
    const service = createServiceClient();
    const { data } = await service.auth.admin.getUserById(id);
    email = data.user?.email ?? "";
    phone = String(data.user?.user_metadata?.profile_phone ?? data.user?.user_metadata?.phone ?? data.user?.phone ?? "");
  } catch {
    const { data: emails } = await supabase.rpc("admin_user_emails");
    email = ((emails ?? []) as { id: string; email: string }[]).find((item) => item.id === id)?.email ?? "";
  }

  const ministry = profile.ministries as unknown as { name: string; slug: string } | null;
  const engagement = parseMlkEngagement(profile.notification_prefs);
  const avatarUrl = profile.avatar_path
    ? (await signedAvatarUrls(supabase, [profile.avatar_path])).get(profile.avatar_path) ?? null
    : null;
  const initials = String(profile.full_name || "?").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const statuses = [
    engagement.none && "Aucun engagement actuellement",
    engagement.equipier && "Équipier MLK",
    engagement.manager && "Manager ou manager adjoint MLK",
    engagement.collaborator && "Collaborateur salarié MLK",
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <Link href={returnTo} className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground">
        <ArrowLeft size={17} /> Retour aux membres
      </Link>

      <section className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex flex-col gap-5 border-b border-border-soft p-5 sm:flex-row sm:items-center sm:p-7">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL Supabase temporaire signée
            <img src={avatarUrl} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="font-title flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface text-2xl text-foreground">{initials}</span>
          )}
          <div className="min-w-0">
            <p className="label text-[10px] tracking-[0.16em] text-muted">FICHE PROFIL</p>
            <h1 className="font-title mt-1 text-[30px] leading-tight text-foreground sm:text-[36px]">{profile.full_name || "Sans nom"}</h1>
            <p className="mt-2 text-sm capitalize text-muted">{profile.role === "admin" ? "Administrateur" : profile.role === "teacher" ? "Formateur" : "Étudiant"}</p>
          </div>
        </div>

        <dl className="grid sm:grid-cols-2">
          <Info icon={<UserRound size={18} />} label="Genre" value={profile.gender === "homme" ? "Homme" : profile.gender === "femme" ? "Femme" : "Non renseigné"} />
          <Info icon={<Mail size={18} />} label="Adresse e-mail" value={email || "Non renseignée"} />
          <Info icon={<Phone size={18} />} label="Téléphone" value={phone || "Non renseigné"} />
          <Info icon={<CalendarDays size={18} />} label="Date d’inscription" value={date(profile.created_at)} />
        </dl>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-background p-5 sm:p-6">
          <p className="label text-[11px] tracking-[0.16em] text-muted">SENSIBILITÉ MINISTÉRIELLE</p>
          {ministry ? (
            <div className="mt-5 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface"><MinistryPicto slug={ministry.slug} size={25} /></span>
              <p className="font-title text-[24px] text-foreground">{ministry.name}</p>
            </div>
          ) : <p className="mt-5 text-sm text-muted">Non renseignée</p>}
        </article>

        <article className="rounded-xl border border-border bg-background p-5 sm:p-6">
          <p className="label text-[11px] tracking-[0.16em] text-muted">IMPLICATION À MLK</p>
          {engagement.completed && statuses.length ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">{statuses.map((status) => <span key={status} className="rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-foreground">{status}</span>)}</div>
              {engagement.equipierServices && <p className="text-sm text-muted"><strong className="text-foreground">Service(s) comme équipier :</strong> {engagement.equipierServices}</p>}
              {engagement.managerServices && <p className="text-sm text-muted"><strong className="text-foreground">Service(s) comme manager :</strong> {engagement.managerServices}</p>}
            </div>
          ) : <p className="mt-5 text-sm text-muted">Non renseignée</p>}
        </article>
      </section>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-3 border-b border-border-soft p-5 last:border-b-0 sm:border-r sm:p-6 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(even)]:border-r-0">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted">{label}</dt>
        <dd className="mt-1 break-words text-[15px] font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}
