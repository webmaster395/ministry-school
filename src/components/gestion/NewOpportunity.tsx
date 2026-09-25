import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getProposalRights, getServices } from "@/lib/data/opportunities";
import { createOpportunity } from "@/app/etudiant/services/actions";
import { longDateLabel, programDates } from "@/lib/program-dates";

const field = "w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background";

/** Le formulaire de proposition, pour un responsable de service (formation) ou un chef de projet (projet). */
export default async function NewOpportunity({
  type,
  exemple = false,
}: {
  type: "formation" | "projet";
  exemple?: boolean;
}) {
  const back = type === "projet" ? "/gestion/projets" : "/gestion/services";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rights, services, { data: profiles }, { data: me }] = await Promise.all([
    getProposalRights(supabase, user!.id),
    getServices(supabase),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.from("profiles").select("full_name, role").eq("id", user!.id).single(),
  ]);
  if (!rights[type]) redirect(back);

  const isAdmin = me?.role === "admin";
  const dates = programDates();

  const sample = type === "projet"
    ? {
        title: "Podcast & Média : Les Voix de l'Évangile",
        organizer: me?.full_name || "Mikaël Coulibaly",
        capacity: 15,
        place: "Espace Martin Luther King",
        room: "Salle Giroud",
        description:
          "Création et diffusion d'une série de podcasts thématiques sur la foi et la vie quotidienne. Les étudiants apprendront les techniques d'enregistrement en studio, d'interview, de montage audio et de diffusion sur les plateformes numériques.",
        objectives:
          "Maîtriser la prise de son et le matériel de studio\nRéaliser des interviews structurées et dynamiques\nMonter et mixer 3 épisodes complets de podcast\nDiffuser et valoriser les contenus sur les réseaux",
        prerequisites: "Avoir une bonne aisance à l'oral\nApporter un ordinateur portable et des écouteurs",
        referentId: profiles?.[0]?.id ?? "",
      }
    : {
        title: "Accompagnement et Écoute Pastorale",
        organizer: me?.full_name || "Responsable de Service",
        capacity: 25,
        place: "Espace Martin Luther King",
        room: "Salle Emmaüs",
        description:
          "Formation pratique destinée aux bénévoles souhaitant développer leurs compétences d'écoute active, de prière d'accompagnement et de soutien spirituel auprès des membres de l'assemblée.",
        objectives:
          "Comprendre les principes éthiques et la confidentialité dans l'écoute\nDévelopper des techniques d'écoute active et de reformulation\nAccompagner dans la prière avec discernement et bienveillance\nOrienter vers des professionnels compétents lorsque nécessaire",
        prerequisites:
          "Être engagé dans un service de l'église depuis au moins 6 mois\nValidation préalable par le responsable de service",
        serviceId: services?.[0]?.id ?? "",
      };

  return (
    <div className="space-y-5">
      <BackButton
        fallbackHref={back}
        fallbackLabel={type === "projet" ? "Mes projets" : "Mes formations"}
      />

      <section className="max-w-[760px] rounded-lg border border-border bg-background p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-title text-[24px] text-foreground">
              {type === "formation" && rights.formation
                ? "Proposer une formation"
                : type === "projet" && rights.projet
                  ? "Proposer un projet"
                  : "Proposer une formation ou un projet"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {type === "formation" && rights.formation
                ? "Une formation est proposée par un responsable de service."
                : type === "projet" && rights.projet
                  ? "Un projet est proposé par un chef de projet."
                  : "Une formation est proposée par un responsable de service, un projet par un chef de projet."}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface/70 px-3 py-2 text-xs">
            {exemple ? (
              <span className="flex items-center gap-2 text-foreground font-medium">
                <Sparkles size={14} className="text-emerald-500" /> Exemple pré-rempli ·{" "}
                <Link
                  href={type === "projet" ? "/gestion/projets/nouveau" : "/gestion/services/nouveau"}
                  className="text-muted hover:text-foreground underline"
                >
                  Effacer
                </Link>
              </span>
            ) : (
              <Link
                href={type === "projet" ? "/gestion/projets/nouveau?exemple=1" : "/gestion/services/nouveau?exemple=1"}
                className="flex items-center gap-1.5 font-semibold text-foreground underline underline-offset-2 hover:text-link"
              >
                <Sparkles size={14} /> Pré-remplir un exemple complet
              </Link>
            )}
          </div>
        </div>

        <form key={`${type}-${exemple}`} action={createOpportunity} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Type</label>
            <select
              name="kind"
              required
              className={field}
              defaultValue={
                type === "projet" && rights.projet
                  ? "projet"
                  : type === "formation" && rights.formation
                    ? "formation"
                    : rights.formation
                      ? "formation"
                      : "projet"
              }
            >
              {rights.formation && <option value="formation">Formation par un service</option>}
              {rights.projet && <option value="projet">Projet</option>}
            </select>
          </div>

          {type === "formation" ? (
            <div>
              <label className="mb-1 block text-xs text-muted">Service *</label>
              <select
                name="service_id"
                required
                className={field}
                defaultValue={exemple && "serviceId" in sample ? sample.serviceId : ""}
              >
                <option value="">— Choisir un service —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-muted">Référent du suivi *</label>
              <select
                name="referent_id"
                required
                className={field}
                defaultValue={exemple && "referentId" in sample ? sample.referentId : ""}
              >
                <option value="">— Sélectionner une personne —</option>
                {profiles?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Titre *</label>
            <input
              name="title"
              required
              defaultValue={exemple ? sample.title : ""}
              placeholder="Titre du projet"
              className={field}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">
              {type === "projet" ? "Chef de projet principal *" : "Responsable principal *"}
            </label>
            <input
              name="organizer_label"
              required
              defaultValue={exemple ? sample.organizer : me?.full_name ?? ""}
              placeholder="Nom et prénom"
              className={field}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Capacité maximale * (Nombre maximal d&apos;inscrits)</label>
            <input
              type="number"
              min={1}
              name="capacity"
              required
              defaultValue={exemple ? sample.capacity : ""}
              placeholder="ex : 20"
              className={field}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Lieu *</label>
            <select
              name="place"
              className={field}
              defaultValue={exemple ? sample.place : "Espace Martin Luther King"}
            >
              <option value="Espace Martin Luther King">Espace Martin Luther King</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Salle (facultatif)</label>
            <input
              name="room"
              defaultValue={exemple ? sample.room : ""}
              placeholder="ex : Salle 102"
              className={field}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">
              Dates des samedis (Horaire fixe : 14 h 30–17 h)
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-surface/40 p-3 sm:grid-cols-3">
              {dates.map((d) => (
                <label key={d} className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    name="dates"
                    value={d}
                    defaultChecked
                    className="h-3.5 w-3.5"
                  />
                  {longDateLabel(d)}
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">
              Présentation * (Présentez en quelques lignes le contenu, l&apos;intérêt et le déroulement)
            </label>
            <textarea
              name="description"
              rows={4}
              required
              defaultValue={exemple ? sample.description : ""}
              className={field}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Objectifs (un objectif par ligne)</label>
            <textarea
              name="objectives"
              rows={3}
              defaultValue={exemple ? sample.objectives : ""}
              placeholder={"Acquérir les bases...\nMener un projet d'équipe..."}
              className={field}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">
              Prérequis (un par ligne, ou laisser vide si aucun prérequis)
            </label>
            <textarea
              name="prerequisites"
              rows={2}
              defaultValue={exemple ? sample.prerequisites : ""}
              placeholder="Laisser vide si aucun prérequis particulier"
              className={field}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 sm:col-span-2">
            <button
              type="submit"
              name="intent"
              value="publish"
              className="label rounded-md bg-accent px-5 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221]"
            >
              {isAdmin ? `Publier ${type === "projet" ? "le projet" : "la formation"}` : "Soumettre à validation"}
            </button>
            <button
              type="submit"
              name="intent"
              value="draft"
              className="rounded-md border border-border px-4 py-2 text-xs text-muted transition hover:text-foreground"
            >
              Enregistrer comme brouillon
            </button>
            {!isAdmin && (
              <p className="mt-1 w-full text-xs text-muted">
                Votre proposition sera transmise aux Admin pour validation. Elle ne sera pas visible des étudiants tant qu&apos;elle n&apos;est pas validée.
              </p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
