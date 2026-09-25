import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarDays,
  Check,
  CircleUser,
  Clock,
  ExternalLink,
  MapPin,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import RejectOpportunityDialog from "@/components/RejectOpportunityDialog";
import { createClient } from "@/lib/supabase/server";
import {
  getOpportunities,
  getOpportunityCounts,
  getServices,
  KIND_LABEL,
  statusOf,
  STATUS_LABEL,
  type OpportunityKind,
} from "@/lib/data/opportunities";
import ReportUpload from "@/components/ReportUpload";
import { signedAvatarUrls } from "@/lib/avatars";
import { formatSessionDate } from "@/lib/format";
import { setRegistrationOpen, validateOpportunity } from "@/app/etudiant/services/actions";
import { DETAILS_ENABLED, linesOf } from "@/lib/opportunity-details";
import { AFTERNOON, programDates } from "@/lib/program-dates";
import DeleteOpportunityButton from "./DeleteOpportunityButton";
import { assignLead } from "@/app/gestion/actions";
import EditOpportunityDialog from "./EditOpportunityDialog";

const COPY: Record<OpportunityKind, { slug: string; back: string; leadRole: string }> = {
  projet: { slug: "projets", back: "Mes projets", leadRole: "Chef de projet principal" },
  formation: { slug: "services", back: "Mes formations", leadRole: "Responsable principal" },
};

/**
 * La page « Gérer » d'une formation ou d'un projet pour le chef de projet ou responsable :
 * affiche l'intégralité des informations saisies (titre, présentation, chef de projet, référent du suivi,
 * dates, horaire fixe 14h30-17h, lieu et salle, capacité, objectifs, prérequis), permet de modifier la fiche
 * à tout moment, et gère les comptes rendus et les inscrits.
 */
export default async function OpportunityManage({ id, kind }: { id: string; kind: OpportunityKind }) {
  const copy = COPY[kind];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [all, counts, { data: me }, services] = await Promise.all([
    getOpportunities(supabase),
    getOpportunityCounts(supabase),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    getServices(supabase),
  ]);
  const o = all.find((x) => x.id === id && x.kind === kind);
  if (!o || (o.created_by !== user!.id && o.lead_id !== user!.id && me?.role !== "admin")) {
    redirect(`/gestion/${copy.slug}`);
  }

  const isAdmin = me?.role === "admin";
  // Supprimer : l'auteur de la fiche ou un Admin (un responsable attribué ne supprime pas la formation)
  const canDelete = o.created_by === user!.id || isAdmin;
  // Un Admin attribue une formation à l'un des responsables de service
  const serviceLeads =
    isAdmin && kind === "formation"
      ? ((await supabase.from("profiles").select("id, full_name").eq("is_service_lead", true).order("full_name")).data ?? [])
      : [];

  const today = new Date().toISOString().slice(0, 10);
  const taken = counts.get(o.id) ?? 0;
  const status = statusOf(o, taken, today);
  const organizer = o.organizer_label ?? o.services?.name ?? "Non spécifié";

  const [{ data: dateRows }, { data: reportRows }, { data: participantRows }] = await Promise.all([
    supabase
      .from("opportunity_dates")
      .select("session_date, start_time, end_time, room")
      .eq("opportunity_id", o.id)
      .order("session_date"),
    supabase.from("opportunity_reports").select("session_date, file_name").eq("opportunity_id", o.id),
    supabase.rpc("opportunity_participants", { p_opp: o.id }),
  ]);
  const dates = (dateRows ?? []) as { session_date: string; start_time: string; end_time: string; room: string | null }[];
  const reportOf = new Map((reportRows ?? []).map((r) => [r.session_date as string, r.file_name as string]));
  const participants = (participantRows ?? []) as { full_name: string; avatar_path: string | null }[];
  const photos = await signedAvatarUrls(supabase, participants.map((p) => p.avatar_path));

  // Récupération sécurisée du référent du suivi (si projet)
  let referentProfile: { id: string; full_name: string } | null = null;
  const rawReferentId = (o as unknown as { referent_id?: string | null }).referent_id;
  if (rawReferentId) {
    const { data: refUser } = await supabase.from("profiles").select("id, full_name").eq("id", rawReferentId).single();
    if (refUser) referentProfile = refUser;
  }
  const { data: referentRpc } = await supabase.rpc("opportunity_referent", { p_opp: o.id });
  const referentName = referentProfile?.full_name ?? (typeof referentRpc === "string" && referentRpc ? referentRpc : null);

  // Lieu et salle extraits des dates
  const firstRoom = dates[0]?.room ?? "";
  const [firstPlace, ...restRoom] = firstRoom.split(" · ");
  const initialPlace = firstPlace?.trim() || "Espace Martin Luther King";
  const initialRoom = restRoom.join(" · ").trim();

  // Objectifs et prérequis
  const objectives = linesOf(o.objectives);
  const prerequisites = linesOf(o.prerequisites);

  return (
    <div className="space-y-6">
      {/* ── Barre de navigation haute ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton fallbackHref={`/gestion/${copy.slug}`} fallbackLabel={copy.back} />
        <Link
          href={`/etudiant/services/${o.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition hover:text-foreground"
        >
          Voir la vue étudiant <ExternalLink size={13} />
        </Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Colonne principale ── */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-background p-6 sm:p-7">
            {/* Badges d'état et bouton d'édition */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="label rounded-full bg-surface px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-foreground">
                  {KIND_LABEL[o.kind]}
                </span>
                <span className="label rounded-full bg-surface px-3 py-1 text-[11px] tracking-[0.1em] text-muted">
                  {STATUS_LABEL[status]}
                </span>
                <span className="label rounded-full bg-surface px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-foreground">
                  {o.registration_open ? "Publié · Inscriptions ouvertes" : "En attente de validation"}
                </span>
              </div>

              {/* Boutons pour modifier / supprimer la fiche */}
              <div className="flex flex-wrap items-center gap-2">
              <EditOpportunityDialog
                id={o.id}
                kind={o.kind}
                title={o.title}
                organizer={organizer}
                serviceId={o.service_id}
                description={o.description}
                capacity={o.capacity}
                objectives={o.objectives}
                prerequisites={o.prerequisites}
                referent={referentProfile}
                selectedDates={dates.map((d) => d.session_date)}
                initialPlace={initialPlace}
                initialRoom={initialRoom}
                services={services}
                dates={programDates()}
                details={DETAILS_ENABLED}
              />
              {canDelete && <DeleteOpportunityButton id={o.id} title={o.title} kind={o.kind} />}
              </div>
            </div>

            {!o.registration_open && (
              me?.role === "admin" ? (
                <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-[14px]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Clock size={18} className="mt-0.5 shrink-0 text-muted" />
                      <div>
                        <strong className="block font-semibold text-foreground">Proposition en attente de validation</strong>
                        <span className="text-[13px] text-muted">
                          Cette fiche a été soumise pour examen. Validez-la pour la publier et ouvrir les inscriptions aux étudiants.
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RejectOpportunityDialog
                        id={o.id}
                        title={o.title}
                        kind={o.kind}
                        variant="danger"
                        triggerLabel="Refuser la proposition"
                      />
                      <form action={validateOpportunity}>
                        <input type="hidden" name="opportunity_id" value={o.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:bg-[#1b2221]"
                        >
                          <Check size={16} /> Valider et publier
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-[14px]">
                  <div className="flex items-start gap-3">
                    <Clock size={18} className="mt-0.5 shrink-0 text-muted" />
                    <div>
                      <strong className="block font-semibold text-foreground">Proposition en attente de validation</strong>
                      <span className="text-[13px] text-muted">
                        Votre proposition a été transmise à l&apos;équipe administrative. Elle ne sera publiée et ouverte aux inscriptions des étudiants qu&apos;après validation par un Admin.
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}

            {isAdmin && kind === "formation" && (
              <form action={assignLead} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
                <input type="hidden" name="id" value={o.id} />
                <div className="min-w-[220px] flex-1">
                  <label htmlFor="lead-select" className="mb-1.5 block text-[13px] text-muted">
                    Responsable de service attribué
                  </label>
                  <select
                    id="lead-select"
                    name="lead_id"
                    defaultValue={o.lead_id ?? ""}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] text-foreground"
                  >
                    <option value="">Aucun responsable attribué</option>
                    {serviceLeads.map((p) => (
                      <option key={p.id as string} value={p.id as string}>
                        {p.full_name as string}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-on-accent transition hover:bg-[#1b2221]"
                >
                  Attribuer
                </button>
              </form>
            )}

            {/* Titre */}
            <h1 className="font-title mt-5 text-[28px] leading-tight text-foreground sm:text-[32px]">{o.title}</h1>

            {/* Présentation */}
            <div className="mt-4 border-t border-border-soft pt-4">
              <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">Présentation</h3>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">
                {o.description || <span className="italic text-muted">Aucune présentation renseignée.</span>}
              </p>
            </div>

            {/* ── Cartes d'informations clés (Chef de projet, Référent, Lieu, Horaires, Capacité) ── */}
            <div className="mt-6 grid gap-3 border-t border-border-soft pt-5 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
                <CircleUser size={20} className="mt-0.5 text-muted" />
                <div className="min-w-0">
                  <span className="block text-[12px] text-muted">{copy.leadRole}</span>
                  <span className="block text-[14px] font-semibold text-foreground">{organizer}</span>
                </div>
              </div>

              {kind === "projet" && (
                <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
                  <UserCheck size={20} className="mt-0.5 text-muted" />
                  <div className="min-w-0">
                    <span className="block text-[12px] text-muted">Référent du suivi</span>
                    <span className="block text-[14px] font-semibold text-foreground">
                      {referentName ?? <span className="italic text-muted">Non assigné</span>}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
                <MapPin size={20} className="mt-0.5 text-muted" />
                <div className="min-w-0">
                  <span className="block text-[12px] text-muted">Lieu & Salle</span>
                  <span className="block text-[14px] font-semibold text-foreground">
                    {initialPlace}
                    {initialRoom ? ` · ${initialRoom}` : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
                <Clock size={20} className="mt-0.5 text-muted" />
                <div className="min-w-0">
                  <span className="block text-[12px] text-muted">Horaire fixe des samedis</span>
                  <span className="block text-[14px] font-semibold text-foreground">{AFTERNOON.label}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 sm:col-span-2">
                <Users size={20} className="mt-0.5 text-muted" />
                <div className="min-w-0">
                  <span className="block text-[12px] text-muted">Capacité et places</span>
                  <span className="block text-[14px] font-semibold text-foreground">
                    {o.capacity !== null
                      ? `${taken} inscrits sur ${o.capacity} places (${Math.max(0, o.capacity - taken)} restante${Math.max(0, o.capacity - taken) > 1 ? "s" : ""})`
                      : `${taken} inscrit${taken > 1 ? "s" : ""} (places illimitées)`}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section Objectifs ── */}
          <section className="rounded-2xl border border-border bg-background p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-muted" />
              <h2 className="font-title text-[20px] text-foreground">Objectifs du projet</h2>
            </div>
            {objectives.length > 0 ? (
              <ul className="mt-4 space-y-2.5">
                {objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-foreground">
                    <Check size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[14px] text-muted">
                Aucun objectif spécifique n&apos;a encore été précisé. Cliquez sur « Modifier la fiche » pour en ajouter.
              </p>
            )}
          </section>

          {/* ── Section Prérequis ── */}
          <section className="rounded-2xl border border-border bg-background p-6 sm:p-7">
            <h2 className="font-title text-[20px] text-foreground">Prérequis</h2>
            {prerequisites.length > 0 ? (
              <ul className="mt-4 space-y-2.5">
                {prerequisites.map((pr, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-foreground">
                    <Check size={18} className="mt-0.5 shrink-0 text-muted" />
                    <span>{pr}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[14px] text-muted">Aucun prérequis particulier.</p>
            )}
          </section>

          {/* ── Section Dates et comptes rendus ── */}
          <section className="rounded-2xl border border-border bg-background p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-muted" />
              <h2 className="font-title text-[20px] text-foreground">Dates et comptes rendus</h2>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Déposez le compte rendu de chaque séance passée pour le suivi du projet.
            </p>

            {dates.length ? (
              <ul className="mt-4 divide-y divide-border-soft">
                {dates.map((d, index) => {
                  const passed = d.session_date <= today;
                  return (
                    <li
                      key={d.session_date}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-[15px]"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-title inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[12px] text-muted">
                            {index + 1}
                          </span>
                          <span className="font-medium text-foreground">{formatSessionDate(d.session_date)}</span>
                          {passed && (
                            <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted">Passée</span>
                          )}
                        </div>
                        <p className="ml-8 mt-0.5 text-[13px] text-muted">
                          {d.start_time.slice(0, 5).replace(":", " h ")} – {d.end_time.slice(0, 5).replace(":", " h ")}
                          {d.room ? ` · ${d.room}` : ""}
                        </p>
                      </div>

                      {passed && (
                        <div className="flex items-center gap-2 text-right">
                          <span className="label rounded-full bg-surface px-2.5 py-1 text-[10px] tracking-[0.1em] text-muted">
                            {reportOf.has(d.session_date)
                              ? `Compte rendu : ${reportOf.get(d.session_date)}`
                              : "Compte rendu attendu"}
                          </span>
                          <ReportUpload
                            opportunityId={o.id}
                            sessionDate={d.session_date}
                            hasReport={reportOf.has(d.session_date)}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">Aucune date n&apos;est encore enregistrée.</p>
            )}
          </section>
        </div>

        {/* ── Volet latéral : Inscrits ── */}
        <aside id="inscrits" className="scroll-mt-6 rounded-2xl border border-border bg-background p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-title text-[20px] text-foreground">Inscrits</h3>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-foreground">
              {participants.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {participants.length} inscrit{participants.length > 1 ? "s" : ""}
            {o.capacity !== null && ` sur ${o.capacity} places`}
          </p>

          {participants.length > 0 ? (
            <ul className="mt-4 divide-y divide-border-soft text-[14px] text-foreground">
              {participants.map((p, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  {p.avatar_path && photos.get(p.avatar_path) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire signée
                    <img src={photos.get(p.avatar_path)} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="font-title flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs text-foreground">
                      {p.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate">{p.full_name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-muted">
              Aucun inscrit pour le moment.
            </p>
          )}

          {status !== "termine" && (
            me?.role === "admin" ? (
              <form
                action={o.registration_open ? setRegistrationOpen : validateOpportunity}
                className="mt-5 border-t border-border-soft pt-4"
              >
                <input type="hidden" name="opportunity_id" value={o.id} />
                <input type="hidden" name="open" value={o.registration_open ? "0" : "1"} />
                <button
                  type="submit"
                  className={`w-full rounded-lg border py-2.5 text-center text-[14px] font-medium transition ${
                    o.registration_open
                      ? "border-border text-muted hover:border-foreground hover:text-foreground"
                      : "border-foreground bg-accent text-on-accent hover:bg-[#1b2221]"
                  }`}
                >
                  {o.registration_open ? "Fermer les inscriptions" : "✓ Valider et publier"}
                </button>
              </form>
            ) : o.registration_open ? (
              <form action={setRegistrationOpen} className="mt-5 border-t border-border-soft pt-4">
                <input type="hidden" name="opportunity_id" value={o.id} />
                <input type="hidden" name="open" value="0" />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-border py-2.5 text-center text-[14px] font-medium text-muted transition hover:border-foreground hover:text-foreground"
                >
                  Fermer temporairement les inscriptions
                </button>
              </form>
            ) : (
              <div className="mt-5 border-t border-border-soft pt-4 text-center">
                <p className="rounded-lg bg-surface p-3 text-[12px] text-muted">
                  🔒 Inscriptions verrouillées tant que la proposition n&apos;est pas validée par l&apos;administration.
                </p>
              </div>
            )
          )}
        </aside>
      </div>
    </div>
  );
}
