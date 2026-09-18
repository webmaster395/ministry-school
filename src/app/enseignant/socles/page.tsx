import { createClient } from "@/lib/supabase/server";
import { updateSocleLabel } from "./actions";

type Socle = {
  id: string;
  label: string;
  description: string | null;
  custom_label: string | null;
  sort_order: number;
};

export default async function TeacherSoclesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("paliers")
    .select("id, label, description, custom_label, sort_order")
    .order("sort_order");

  const socles = (data ?? []) as Socle[];

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="mb-1 label text-xs tracking-[0.18em] text-muted">SOCLES</h2>
      <p className="mb-6 text-sm text-muted">
        Les dates précises ne sont pas encore fixées. Indiquez ce que les étudiants doivent voir
        à la place — une date, une période approximative, ou tout autre repère.
      </p>

      <ul className="space-y-4">
        {socles.map((s) => (
          <li key={s.id} className="rounded-md border border-border p-4">
            <p className="mb-2 font-medium text-foreground">{s.label}</p>
            <form action={updateSocleLabel} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="socle_id" value={s.id} />
              <input
                type="text"
                name="custom_label"
                defaultValue={s.custom_label ?? ""}
                placeholder="Lorem Ipsum"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md label bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221]"
              >
                Enregistrer
              </button>
            </form>
            <p className="mt-2 text-xs text-muted">
              Visible par les étudiants tant que ce champ est vide : « Date à définir ».
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
