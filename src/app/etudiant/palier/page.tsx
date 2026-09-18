import { createClient } from "@/lib/supabase/server";
import { getStudentProfile } from "@/lib/data/student";

type Socle = {
  id: string;
  label: string;
  description: string | null;
  custom_label: string | null;
  sort_order: number;
};

export default async function StudentPalierPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ ministryName }, { data }] = await Promise.all([
    getStudentProfile(supabase, user!.id),
    supabase
      .from("paliers")
      .select("id, label, description, custom_label, sort_order")
      .order("sort_order"),
  ]);

  const socles = (data ?? []) as Socle[];

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="mb-1 label text-xs tracking-[0.18em] text-muted">
        {ministryName ? `MA FORMATION : ${ministryName.toUpperCase()}` : "MA FORMATION"}
      </h2>
      <p className="mb-6 text-sm text-muted">
        À partir de janvier, la formation par ministère avance par socles. Le contenu et les
        dates restent à confirmer par l&apos;équipe pédagogique.
      </p>

      <ul className="space-y-4">
        {socles.map((s) => (
          <li key={s.id} className="rounded-md border border-border p-4">
            <p className="mb-1 font-medium text-foreground">{s.label}</p>
            <p className="text-sm text-muted">{s.custom_label || "Date à définir"}</p>
            {s.description && <p className="mt-2 text-sm text-foreground/80">{s.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
