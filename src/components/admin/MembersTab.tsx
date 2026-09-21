import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMinistries } from "@/lib/data/admin";
import { getServices } from "@/lib/data/opportunities";
import { getMembers, memberStatus, type Member } from "@/lib/data/admin-hub";
import { getMinistry } from "@/lib/ministry";
import MinistryPicto from "@/components/MinistryPicto";
import { addDelegate, removeDelegate, setMemberActive, updateMember } from "@/app/admin/actions";

const field = "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";

const STATUS_LABEL = { actif: "Actif", a_confirmer: "À confirmer", desactive: "Désactivé" };

const rolesOf = (m: Member, services: Map<string, string>, ministries: Map<string, string>) =>
  [
    m.role === "admin" ? "Admin" : null,
    m.is_teacher || m.role === "teacher" ? "Enseignant" : null,
    m.is_project_lead ? "Chef de projet" : null,
    m.is_service_lead ? `Responsable de service${m.service_id ? ` · ${services.get(m.service_id) ?? ""}` : ""}` : null,
    m.ministry_lead_of ? `Pilotage · ${ministries.get(m.ministry_lead_of) ?? ""}` : null,
  ].filter(Boolean) as string[];

const fmt = (d: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(d));

export default async function MembersTab({
  q,
  role,
  sens,
  statut,
  tri,
}: {
  q: string;
  role: string;
  sens: string;
  statut: string;
  tri: string;
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

  const needle = q.trim().toLowerCase();
  const filtered = members
    .filter((m) => !needle || m.full_name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle))
    .filter((m) => {
      if (role === "tous") return true;
      if (role === "admin") return m.role === "admin";
      if (role === "enseignant") return m.is_teacher || m.role === "teacher";
      if (role === "chef") return m.is_project_lead;
      if (role === "responsable") return m.is_service_lead;
      if (role === "pilotage") return !!m.ministry_lead_of;
      return m.role === "student" && !m.is_teacher && !m.is_project_lead && !m.is_service_lead && !m.ministry_lead_of;
    })
    .filter((m) => sens === "toutes" || ministryById.get(m.ministry_id ?? "")?.slug === sens)
    .filter((m) => statut === "tous" || memberStatus(m) === statut)
    .sort((a, b) =>
      tri === "creation" ? b.created_at.localeCompare(a.created_at) : a.full_name.localeCompare(b.full_name, "fr")
    );

  return (
    <div className="space-y-5">
      <form method="get" className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="onglet" value="membres" />
        <label className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher par nom ou e-mail"
            className={`${field} w-full pl-9`}
          />
        </label>
        <select name="role" defaultValue={role} className={field}>
          <option value="tous">Tous les rôles</option>
          <option value="etudiant">Étudiant seulement</option>
          <option value="enseignant">Enseignant</option>
          <option value="chef">Chef de projet</option>
          <option value="responsable">Responsable de service</option>
          <option value="pilotage">Pilotage ministériel</option>
          <option value="admin">Admin</option>
        </select>
        <select name="sens" defaultValue={sens} className={field}>
          <option value="toutes">Toutes les sensibilités</option>
          {ministries.map((m) => (
            <option key={m.id} value={m.slug}>
              {m.name}
            </option>
          ))}
        </select>
        <select name="statut" defaultValue={statut} className={field}>
          <option value="tous">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="a_confirmer">À confirmer</option>
          <option value="desactive">Désactivé</option>
        </select>
        <select name="tri" defaultValue={tri} className={field}>
          <option value="nom">Tri par nom</option>
          <option value="creation">Plus récents</option>
        </select>
        <button
          type="submit"
          className="label rounded-md bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent hover:bg-[#1b2221]"
        >
          Filtrer
        </button>
        <a
          href="/admin/utilisateurs/export"
          className="label rounded-md border border-foreground px-4 py-2.5 text-xs tracking-[0.12em] text-foreground hover:bg-foreground/[0.04]"
        >
          Télécharger (CSV)
        </a>
      </form>

      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="label hidden grid-cols-[1.4fr_1fr_1.6fr_110px_90px] gap-4 border-b border-border px-5 py-3 text-[11px] tracking-[0.14em] text-muted md:grid">
          <span>Membre</span>
          <span>Sensibilité</span>
          <span>Rôles</span>
          <span>Statut</span>
          <span>Création</span>
        </div>

        {filtered.length ? (
          <ul className="divide-y divide-border-soft">
            {filtered.map((m) => {
              const mi = getMinistry(ministryById.get(m.ministry_id ?? "")?.slug);
              const status = memberStatus(m);
              const roles = rolesOf(m, serviceName, ministryName);
              return (
                <li key={m.id} className="px-5 py-3.5">
                  <div className="grid items-center gap-2 md:grid-cols-[1.4fr_1fr_1.6fr_110px_90px] md:gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-foreground">{m.full_name || "Sans nom"}</p>
                      <p className="truncate text-xs text-muted">{m.email}</p>
                    </div>
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

                  <details className="mt-2">
                    <summary className="cursor-pointer list-none text-xs font-medium text-link hover:underline">
                      Modifier les rôles et l&apos;accès
                    </summary>
                    <div className="mt-3 space-y-3 rounded-lg bg-surface p-4">
                      <form action={updateMember} className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="user_id" value={m.id} />
                        <div className="flex flex-col gap-2 text-sm text-foreground">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_admin" defaultChecked={m.role === "admin"} /> Administrateur
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_teacher" defaultChecked={m.is_teacher || m.role === "teacher"} />{" "}
                            Enseignant
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_service_lead" defaultChecked={m.is_service_lead} /> Responsable
                            de service (propose des formations)
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_project_lead" defaultChecked={m.is_project_lead} /> Chef de
                            projet (propose des projets)
                          </label>
                        </div>
                        <div className="space-y-3">
                          <select name="service_id" defaultValue={m.service_id ?? ""} className={`${field} w-full`}>
                            <option value="">Service : aucun</option>
                            {services.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <select
                            name="ministry_lead_of"
                            defaultValue={m.ministry_lead_of ?? ""}
                            className={`${field} w-full`}
                          >
                            <option value="">Pilotage ministériel : aucun</option>
                            {ministries.map((x) => (
                              <option key={x.id} value={x.id}>
                                Pilotage · {x.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="label rounded-md bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent hover:bg-[#1b2221] sm:col-span-2 sm:w-fit"
                        >
                          Enregistrer
                        </button>
                      </form>

                      <form action={setMemberActive} className="border-t border-border pt-3">
                        <input type="hidden" name="user_id" value={m.id} />
                        <input type="hidden" name="active" value={m.deactivated ? "1" : "0"} />
                        <button type="submit" className="text-sm font-medium text-link underline underline-offset-2">
                          {m.deactivated ? "Réactiver ce compte" : "Désactiver ce compte"}
                        </button>
                        <p className="mt-1 text-xs text-muted">
                          {m.deactivated
                            ? "La personne pourra de nouveau se connecter."
                            : "La personne ne pourra plus se connecter. Ses données sont conservées."}
                        </p>
                      </form>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-muted">Aucun membre ne correspond à ces critères.</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background p-6">
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
