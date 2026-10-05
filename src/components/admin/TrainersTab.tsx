/* eslint-disable @next/next/no-img-element -- portraits issus du stockage Supabase */
import FormSubmitButton from "@/components/FormSubmitButton";
import TrainerPhotoInput from "@/components/admin/TrainerPhotoInput";
import { saveTrainer, setTrainerActive } from "@/app/gestion/admin/formateurs/actions";

export type TrainerAdminRow = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  bio: string | null;
  photo_path: string | null;
  is_active: boolean;
  photoUrl: string | null;
};

const field = "w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none transition focus:border-foreground";

function TrainerForm({ trainer }: { trainer?: TrainerAdminRow }) {
  const initials = `${trainer?.first_name?.[0] ?? ""}${trainer?.last_name?.[0] ?? ""}`.toUpperCase();
  return (
    <form action={saveTrainer} className="grid gap-5 lg:grid-cols-[112px_1fr]">
      {trainer && <input type="hidden" name="id" value={trainer.id} />}
      <TrainerPhotoInput name="photo" currentUrl={trainer?.photoUrl} initials={initials} />
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm text-muted">Prénom<input name="first_name" required defaultValue={trainer?.first_name ?? ""} className={field} /></label>
          <label className="space-y-1.5 text-sm text-muted">Nom<input name="last_name" defaultValue={trainer?.last_name ?? ""} className={field} /></label>
        </div>
        <label className="block space-y-1.5 text-sm text-muted">Fonction ou titre<input name="title" defaultValue={trainer?.title ?? ""} placeholder="Ex. Pasteur, coach, intervenante…" className={field} /></label>
        <label className="block space-y-1.5 text-sm text-muted">Courte biographie<textarea name="bio" rows={4} defaultValue={trainer?.bio ?? ""} className={field} /></label>
        <input type="hidden" name="is_active" value={trainer?.is_active === false ? "0" : "1"} />
        <FormSubmitButton className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent" label={trainer ? "Enregistrer les modifications" : "Créer le formateur"} />
      </div>
    </form>
  );
}

export default function TrainersTab({ trainers }: { trainers: TrainerAdminRow[] }) {
  return (
    <div className="space-y-6">
      <header>
        <p className="label text-xs tracking-[0.18em] text-muted">Annuaire centralisé</p>
        <h1 className="font-title mt-2 text-[30px] leading-tight text-foreground sm:text-[38px]">Formateurs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Une seule fiche par intervenant. Sa photo et ses informations se mettent ensuite à jour sur tous ses cours.</p>
      </header>

      <details className="rounded-2xl border border-border bg-background p-5 sm:p-7">
        <summary className="cursor-pointer list-none font-title text-xl text-foreground">+ Ajouter un formateur</summary>
        <div className="mt-6 border-t border-border-soft pt-6"><TrainerForm /></div>
      </details>

      <div className="grid gap-4 xl:grid-cols-2">
        {trainers.map((trainer) => (
          <details key={trainer.id} className={`rounded-2xl border border-border bg-background p-5 ${trainer.is_active ? "" : "opacity-65"}`}>
            <summary className="flex cursor-pointer list-none items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-surface font-semibold text-muted">
                {trainer.photoUrl ? <img src={trainer.photoUrl} alt="" className="h-full w-full object-cover" /> : `${trainer.first_name[0] ?? ""}${trainer.last_name[0] ?? ""}`.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-base text-foreground">{trainer.first_name} {trainer.last_name}</strong><span className="block truncate text-sm text-muted">{trainer.title || (trainer.is_active ? "Formateur" : "Désactivé")}</span></span>
              <span className="text-sm text-link">Modifier</span>
            </summary>
            <div className="mt-6 border-t border-border-soft pt-6"><TrainerForm trainer={trainer} /></div>
            <form action={setTrainerActive} className="mt-5 border-t border-border-soft pt-4">
              <input type="hidden" name="id" value={trainer.id} />
              <input type="hidden" name="active" value={trainer.is_active ? "0" : "1"} />
              <button type="submit" className="text-sm text-muted underline underline-offset-4">{trainer.is_active ? "Désactiver ce formateur" : "Réactiver ce formateur"}</button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
