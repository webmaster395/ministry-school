import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { buildRows, getMinistrySessions, getSteeredMinistries } from "@/lib/data/pilotage";
import { getMinistry } from "@/lib/ministry";
import MinistryPicto from "@/components/MinistryPicto";
import PrepBoard, { type PrepTab } from "@/components/PrepBoard";
import MinistryContributorAccess from "@/components/gestion/MinistryContributorAccess";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";

export default async function PilotagePage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; m?: string; filtre?: string }>;
}) {
  const { onglet, m, filtre } = await searchParams;
  const filter = filtre === "a-completer" || filtre === "prets" || filtre === "sans-formateur" ? filtre : "tous";
  const tab: PrepTab = onglet === "avenir" || onglet === "passes" ? onglet : "prochain";

  const viewer = await getViewer();
  if (!viewer || viewer.roles.steeringMinistryIds.length === 0) redirect("/etudiant");

  const supabase = await createClient();
  // La casquette Pilotage reste strictement limitée aux responsabilités explicites,
  // même lorsque la personne possède aussi le rôle Administrateur.
  const ministryIds = viewer.roles.steeringMinistryIds;
  const steered = await getSteeredMinistries(supabase, ministryIds);
  const ministry = steered.find((x) => x.slug === m) ?? steered[0];
  if (!ministry) redirect("/etudiant");

  const rows = await buildRows(supabase, await getMinistrySessions(supabase, ministry.id), "pilotage");
  const { data: leadProfile } = await supabase
    .from("profiles")
    .select("ministry_lead_of")
    .eq("id", viewer.id)
    .single();
  const canCreateCourse = leadProfile?.ministry_lead_of === ministry.id;
  const { data: delegateRows } = canCreateCourse ? await supabase
    .from("ministry_delegates")
    .select("user_id, can_edit, profile:profiles!ministry_delegates_user_id_fkey(full_name)")
    .eq("ministry_id", ministry.id) : { data: [] };
  const { data: ministryStudents } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_day")
    .eq("ministry_id", ministry.id)
    .eq("email_confirmed", true)
    .or("deactivated.is.null,deactivated.eq.false")
    .order("full_name");

  const requiredDone = rows.reduce((n, r) => n + r.progress.requiredDone, 0);
  const requiredTotal = rows.reduce((n, r) => n + r.progress.requiredTotal, 0);
  const percent = requiredTotal ? Math.round((requiredDone / requiredTotal) * 100) : 0;
  const color = getMinistry(ministry.slug)?.color ?? "var(--border)";

  const hrefFor = (t: PrepTab, f?: string) => {
    const q = new URLSearchParams();
    if (t !== "prochain") q.set("onglet", t);
    if (f && f !== "tous") q.set("filtre", f);
    if (steered.length > 1) q.set("m", ministry.slug);
    const s = q.toString();
    return `/gestion/pilotage${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <ManagementPageHeader eyebrow="ESPACE OPÉRATIONNEL" title="Pilotage du ministère" subtitle="Préparez les cours et suivez uniquement les sensibilités qui vous sont attribuées." />
      {steered.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {steered.map((x) => (
            <Link
              key={x.id}
              href={`/gestion/pilotage?m=${x.slug}`}
              className={`rounded-lg px-4 py-2 text-sm ${
                x.id === ministry.id
                  ? "bg-accent font-medium text-on-accent"
                  : "border border-border bg-background text-muted"
              }`}
            >
              {x.name}
            </Link>
          ))}
        </div>
      )}

      <section className="grid gap-6 rounded-lg border border-border bg-background p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:divide-x lg:divide-border-soft">
        <div>
          <p className="text-sm text-muted">Ministère supervisé</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${color} 30%, transparent)` }}
            >
              <MinistryPicto slug={ministry.slug} size={22} />
            </span>
            <h2 className="font-title text-[26px] leading-tight text-foreground">{ministry.name}</h2>
          </div>
        </div>
        <div className="lg:pl-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted">Préparation du programme</p>
            <p className="font-title text-[26px] text-foreground">{percent} %</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </section>

      <PrepBoard
        tab={tab}
        hrefFor={(t) => hrefFor(t)}
        labels={{ avenir: "Cours à venir", passes: "Cours passés" }}
        ministry={{ slug: ministry.slug, name: ministry.name, id: ministry.id }}
        canCreateCourse={canCreateCourse}
        upcomingFilter={{
          current: filter,
          hrefFor: (f) => hrefFor("avenir", f),
          options: ["tous", "a-completer", "prets", "sans-formateur"],
        }}
        rows={rows}
        ministryColor={color}
        today={new Date().toISOString().slice(0, 10)}
      />

      {canCreateCourse && <section className="rounded-2xl border border-border bg-background p-5 sm:p-6"><h2 className="font-title text-[20px]">Accès des contributeurs</h2><p className="mb-4 mt-1 text-sm text-muted">La Super administration choisit les contributeurs. Vous pouvez seulement définir leur accès en lecture ou en modification.</p><MinistryContributorAccess ministryId={ministry.id} contributors={(delegateRows ?? []).map((row) => ({ user_id: row.user_id as string, full_name: ((row.profile as unknown as { full_name?: string | null } | null)?.full_name || "Membre"), can_edit: !!row.can_edit }))} /></section>}

      <details className="rounded-2xl border border-border bg-background">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-foreground sm:px-6">
          Étudiants inscrits à cette sensibilité ({ministryStudents?.length ?? 0})
        </summary>
        <div className="border-t border-border-soft px-5 py-4 sm:px-6">
          {ministryStudents?.length ? (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ministryStudents.map((student) => (
                <li key={student.id} className="rounded-xl bg-surface px-3 py-2.5 text-sm text-foreground">
                  {student.full_name || "Nom non renseigné"}
                  {student.preferred_day && (
                    <span className="ml-2 text-xs capitalize text-muted">{student.preferred_day}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Aucun étudiant inscrit à cette sensibilité.</p>
          )}
        </div>
      </details>
    </div>
  );
}
