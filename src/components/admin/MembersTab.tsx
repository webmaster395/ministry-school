import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMinistries } from "@/lib/data/admin";
import { getServices } from "@/lib/data/opportunities";
import { getMembers, memberStatus, type Member } from "@/lib/data/admin-hub";
import { signedAvatarUrls } from "@/lib/avatars";
import { getMinistry } from "@/lib/ministry";
import MinistryPicto from "@/components/MinistryPicto";
import MemberAccessEditor from "@/components/admin/MemberAccessEditor";
import MemberFilters from "@/components/admin/MemberFilters";
import { addDelegate, removeDelegate } from "@/app/gestion/admin/actions";
import { parseMlkEngagement } from "@/lib/mlk-engagement";

const field = "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";

const STATUS_LABEL = { actif: "Actif", a_confirmer: "À confirmer", desactive: "Désactivé" };

const rolesOf = (m: Member, services: Map<string, string>, ministries: Map<string, string>) => {
  if (m.role === "admin") {
    const extra: string[] = [];
    if (m.service_id && services.get(m.service_id)) extra.push(`Service · ${services.get(m.service_id)}`);
    if (m.ministry_lead_of && ministries.get(m.ministry_lead_of)) extra.push(`Pilotage · ${ministries.get(m.ministry_lead_of)}`);
    return extra.length > 0 ? ["Admin", ...extra] : ["Admin (accès complet)"];
  }
  return [
    m.is_teacher || m.role === "teacher" ? "Formateur" : null,
    m.is_project_lead ? "Chef de projet" : null,
    m.is_service_lead ? `Responsable de service${m.service_id ? ` · ${services.get(m.service_id) ?? ""}` : ""}` : null,
    m.ministry_lead_of ? `Pilotage · ${ministries.get(m.ministry_lead_of) ?? ""}` : null,
  ].filter(Boolean) as string[];
};

/** Minuscules et sans accents : « Stéphie » se trouve en tapant « stephie ». */
const plain = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const fmt = (d: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(d));

export default async function MembersTab({
  q,
  role,
  sens,
  statut,
  tri,
  implication,
  genre,
  page,
  par,
}: {
  q: string;
  role: string;
  sens: string;
  statut: string;
  tri: string;
  implication: string;
  genre: string;
  page: string;
  par: string;
}) {
  const supabase = await createClient();
  const [members, ministries, services, { data: delegates }] = await Promise.all([
    getMembers(supabase),
    getMinistries(supabase),
    getServices(supabase),
    supabase.from("ministry_delegates").select("id, email, user_id, ministry_id").order("created_at"),
  ]);

  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const ministryName = new Map(ministries.map((m) => [m.id, m.name]));
  const ministryById = new Map(ministries.map((m) => [m.id, m]));

  // Chaque mot tapé doit se retrouver dans le nom ou l'e-mail, dans n'importe quel ordre
  const words = plain(q).split(/\s+/).filter(Boolean);
  const filtered = members
    .filter((m) => {
      if (!words.length) return true;
      const haystack = plain(`${m.full_name} ${m.email}`);
      return words.every((w) => haystack.includes(w));
    })
    .filter((m) => {
      if (role === "tous") return true;
      if (role === "admin") return m.role === "admin";
      if (role === "enseignant") return m.is_teacher || m.role === "teacher";
      if (role === "chef") return m.is_project_lead;
      if (role === "responsable") return m.is_service_lead;
      if (role === "pilotage") return !!m.ministry_lead_of;
      return m.role === "student" && !m.is_teacher && !m.is_project_lead && !m.is_service_lead && !m.ministry_lead_of;
    })
    .filter((m) => sens === "toutes" || (sens === "non_renseignee" ? !m.ministry_id : ministryById.get(m.ministry_id ?? "")?.slug === sens))
    .filter((m) => statut === "tous" || memberStatus(m) === statut)
    .filter((m) => {
      if (genre === "tous") return true;
      if (genre === "non_renseigne") return m.gender !== "homme" && m.gender !== "femme";
      return m.gender === genre;
    })
    .filter((m) => {
      if (implication === "toutes") return true;
      const item = parseMlkEngagement(m.notification_prefs);
      if (implication === "aucun") return item.completed && item.none;
      if (implication === "equipier") return item.completed && item.equipier;
      if (implication === "manager") return item.completed && item.manager;
      if (implication === "collaborateur") return item.completed && item.collaborator;
      if (implication === "non_renseigne") return !item.completed;
      return true;
    })
    .sort((a, b) =>
      tri === "creation" ? b.created_at.localeCompare(a.created_at) : a.full_name.localeCompare(b.full_name, "fr")
    );

  // Pagination : 25, 50 ou 100 membres par page (50 par défaut)
  const perPage = [25, 50, 100].includes(Number(par)) ? Number(par) : 50;
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(Math.max(1, parseInt(page, 10) || 1), pageCount);
  const shown = filtered.slice((current - 1) * perPage, current * perPage);
  const avatarUrls = await signedAvatarUrls(supabase, shown.map((m) => m.avatar_path));

  /** Lien vers une autre page, en gardant la recherche et les filtres. */
  const pageHref = (n: number) => {
    const qs = new URLSearchParams({ onglet: "membres", q, role, sens, statut, tri, implication, genre, par: String(perPage), page: String(n) });
    return `/gestion/admin?${qs.toString()}`;
  };
  const pager = (
    <nav aria-label="Pages de membres" className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span>
        {filtered.length ? (
          <>
            {(current - 1) * perPage + 1}–{Math.min(current * perPage, filtered.length)} sur {filtered.length} membre{filtered.length > 1 ? "s" : ""}
          </>
        ) : null}
      </span>
      {pageCount > 1 && (
        <span className="flex items-center gap-2">
          {current > 1 ? (
            <Link href={pageHref(current - 1)} className="rounded-md border border-border px-3 py-1.5 text-foreground transition hover:border-foreground">
              ← Précédent
            </Link>
          ) : (
            <span className="rounded-md border border-border-soft px-3 py-1.5 opacity-50">← Précédent</span>
          )}
          <span className="px-1 tabular-nums">Page {current} sur {pageCount}</span>
          {current < pageCount ? (
            <Link href={pageHref(current + 1)} className="rounded-md border border-border px-3 py-1.5 text-foreground transition hover:border-foreground">
              Suivant →
            </Link>
          ) : (
            <span className="rounded-md border border-border-soft px-3 py-1.5 opacity-50">Suivant →</span>
          )}
        </span>
      )}
    </nav>
  );

  const listParams = new URLSearchParams({ onglet: "membres", q, role, sens, statut, tri, implication, genre, par: String(perPage), page: String(current) });
  const returnTo = `/gestion/admin?${listParams.toString()}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <MemberFilters
            initial={{ q, role, sens, statut, implication, genre, tri, par: String(perPage) }}
            ministries={ministries.map((m) => ({ id: m.id, name: m.name, slug: m.slug }))}
          />
        </div>
        <a
          href="/gestion/admin/utilisateurs/export"
          className="label inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 text-xs tracking-[0.12em] text-foreground hover:border-foreground/40"
        >
          Télécharger (CSV)
        </a>
      </div>

      {pager}

      <section suppressHydrationWarning className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="label hidden grid-cols-[1.4fr_1fr_1.6fr_110px_90px] gap-4 border-b border-border px-5 py-3 text-[11px] tracking-[0.14em] text-muted md:grid">
          <span>Membre</span>
          <span>Sensibilité</span>
          <span>Rôles</span>
          <span>Statut</span>
          <span>Création</span>
        </div>

        {filtered.length ? (
          <ul className="divide-y divide-border-soft">
            {shown.map((m) => {
              const mi = getMinistry(ministryById.get(m.ministry_id ?? "")?.slug);
              const status = memberStatus(m);
              const roles = rolesOf(m, serviceName, ministryName);
              return (
                <li key={m.id} className="px-5 py-3.5">
                  <div className="grid items-center gap-2 md:grid-cols-[1.4fr_1fr_1.6fr_110px_90px] md:gap-4">
                    <Link href={`/gestion/admin/membres/${m.id}?returnTo=${encodeURIComponent(returnTo)}`} className="group flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-foreground">
                      {m.avatar_path && avatarUrls.get(m.avatar_path) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire signée
                        <img src={avatarUrls.get(m.avatar_path)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="font-title flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-sm text-foreground">
                          {(m.full_name || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[15px] font-semibold text-foreground">{m.full_name || "Sans nom"}</p>
                          {m.gender && (
                            <span
                              className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted"
                              title={m.gender === "homme" ? "Homme" : "Femme"}
                            >
                              {m.gender === "homme" ? "H" : "F"}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted">{m.email}</p>
                      </div>
                      <ChevronRight size={16} className="ml-auto shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                    </Link>
                    <span className="flex items-center gap-2 text-[15px] text-foreground">
                      {mi ? (
                        <>
                          <MinistryPicto slug={mi.slug} size={18} /> {mi.name}
                        </>
                      ) : (
                        <span className="text-muted">Non renseignée</span>
                      )}
                    </span>
                    <span className="text-sm text-foreground">{roles.length ? roles.join(" · ") : "Étudiant"}</span>
                    <span
                      className={`label w-fit rounded-full px-2.5 py-1 text-[10px] tracking-[0.1em] ${
                        status === "actif"
                          ? "bg-surface text-foreground"
                          : status === "a_confirmer"
                            ? "bg-m-doctoral/[0.12] text-link"
                            : "border border-foreground text-foreground"
                      }`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="text-sm tabular-nums text-muted">{fmt(m.created_at)}</span>
                  </div>

                  <MemberAccessEditor member={m} services={services} ministries={ministries} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-muted">Aucun membre ne correspond à ces critères.</p>
        )}
      </section>

      {pager}

      <section suppressHydrationWarning className="rounded-lg border border-border bg-background p-6">
        <h3 className="font-title text-[22px] text-foreground">Secrétaires de pilotage</h3>
        <p className="mt-1 text-sm text-muted">
          Une adresse e-mail ajoutée ici donne la même vue que le pasteur du ministère. Si la personne n&apos;a pas
          encore de compte, l&apos;accès s&apos;active à sa première connexion.
        </p>

        <form action={addDelegate} className="mt-4 flex flex-wrap items-end gap-3">
          <select name="ministry_id" required defaultValue="" className={field}>
            <option value="" disabled>
              Ministère…
            </option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            type="email"
            name="email"
            required
            placeholder="secretaire@exemple.fr"
            className={`${field} min-w-[240px] flex-1`}
          />
          <button
            type="submit"
            className="label rounded-md bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent hover:bg-[#1b2221]"
          >
            Donner l&apos;accès
          </button>
        </form>

        {(delegates ?? []).length > 0 && (
          <ul className="mt-5 divide-y divide-border-soft">
            {(delegates ?? []).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="text-foreground">
                  {d.email} <span className="text-muted">· {ministryName.get(d.ministry_id) ?? ""}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="label rounded-full bg-surface px-2.5 py-1 text-[10px] tracking-[0.1em] text-muted">
                    {d.user_id ? "Compte lié" : "En attente de connexion"}
                  </span>
                  <form action={removeDelegate}>
                    <input type="hidden" name="delegate_id" value={d.id} />
                    <button type="submit" className="text-xs text-link hover:underline">
                      Retirer
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
