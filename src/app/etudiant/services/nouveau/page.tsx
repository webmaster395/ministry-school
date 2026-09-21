import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProposalRights, getServices } from "@/lib/data/opportunities";
import { createOpportunity } from "../actions";

const field = "w-full rounded-md border border-border px-3 py-2 text-sm text-foreground";

export default async function NewOpportunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rights, services] = await Promise.all([
    getProposalRights(supabase, user!.id),
    getServices(supabase),
  ]);
  if (!rights.formation && !rights.projet) redirect("/etudiant/services");

  return (
    <div className="space-y-5">
      <Link
        href="/etudiant/services"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft size={16} /> Services et projets
      </Link>

      <section className="max-w-[760px] rounded-lg border border-border bg-background p-6 sm:p-7">
        <h2 className="font-title text-[26px] text-foreground">Proposer une formation ou un projet</h2>
        <p className="mt-1 text-sm text-muted">
          Une formation est proposée par un responsable de service, un projet par un chef de projet.
        </p>

        <form action={createOpportunity} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Type</label>
            <select name="kind" required className={field} defaultValue={rights.formation ? "formation" : "projet"}>
              {rights.formation && <option value="formation">Formation par un service</option>}
              {rights.projet && <option value="projet">Projet</option>}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Service</label>
            <select name="service_id" className={field} defaultValue="">
              <option value="">— Aucun —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Titre</label>
            <input name="title" required className={field} />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Description</label>
            <textarea name="description" rows={4} required className={field} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Organisateur affiché</label>
            <input name="organizer_label" placeholder="ex : Équipe Créatech" className={field} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Calendrier affiché</label>
            <input
              name="schedule_label"
              placeholder="ex : Trois samedis · de septembre à novembre 2026"
              className={field}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Début</label>
            <input type="date" name="starts_on" className={field} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Fin (passé cette date, c&apos;est terminé)</label>
            <input type="date" name="ends_on" className={field} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Nombre de places (vide = illimité)</label>
            <input type="number" min={1} name="capacity" className={field} />
          </div>

          <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
            <input type="checkbox" name="registration_open" defaultChecked />
            Inscriptions ouvertes
          </label>

          <button
            type="submit"
            className="label rounded-md bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] sm:col-span-2 sm:w-fit"
          >
            Publier
          </button>
        </form>
      </section>
    </div>
  );
}
