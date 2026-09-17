import { createClient } from "@/lib/supabase/server";

const descriptions: Record<string, string> = {
  apotre: "Fondation, envoi et implantation — poser des bases solides pour l'œuvre.",
  prophete: "Écoute et direction — discerner et transmettre ce que dit l'Esprit.",
  evangeliste: "Annonce et transmission — porter la bonne nouvelle à l'extérieur.",
  pasteur: "Accompagnement et soin — prendre soin du troupeau au quotidien.",
  docteur: "Enseignement et formation — structurer et transmettre la connaissance.",
};

export default async function StudentFormationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: ministries }, { data: profile }] = await Promise.all([
    supabase.from("ministries").select("id, slug, name").order("name"),
    supabase.from("profiles").select("ministry_id").eq("id", user!.id).single(),
  ]);

  return (
    <div className="space-y-6">
      {/* PHASE 1 : Tronc commun */}
      <section className="rounded-lg border border-border bg-background p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide text-muted">PHASE 1 — TRONC COMMUN</h2>
          <span className="rounded-full border border-border bg-foreground/5 px-2.5 py-0.5 text-xs text-muted">
            Octobre → Décembre
          </span>
        </div>
        <p className="mb-4 text-sm text-muted">
          Enseignement commun à tous les ministères, un week-end par mois à l’<strong>Espace Grand Paris</strong>.
          Plénière le matin et ateliers de mise en pratique. Salles disponibles : Giroud, Rosa Parks, Denis.
        </p>

        <div className="rounded-md border border-accent/30 bg-accent/5 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Ce samedi 19 septembre</span>
          <p className="mt-1 text-base font-semibold text-foreground">Le caractère</p>
          <p className="mt-0.5 text-sm text-foreground">
            Intervenant : <strong className="font-semibold">Paul Goulet</strong>
          </p>
          <p className="mt-1 text-xs text-muted">
            Lieu : <strong>MLK 2</strong> (MLK Studio) · Horaires : 09h30 – 17h00 · Tronc commun tous ministères
          </p>
        </div>
      </section>

      {/* PHASE 2 : Ministères */}
      <section className="rounded-lg border border-border bg-background p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide text-muted">PHASE 2 — PAR MINISTÈRE</h2>
          <span className="rounded-full border border-border bg-foreground/5 px-2.5 py-0.5 text-xs text-muted">
            À partir de janvier
          </span>
        </div>
        <p className="mb-6 text-sm text-muted">
          À partir de janvier, les cours se poursuivent par ministère à <strong>MLK 2</strong> (= MLK Studio), le samedi et le
          dimanche (mêmes contenus, au choix de l&apos;étudiant).
        </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {(ministries ?? []).map((m) => {
          const isMine = m.id === profile?.ministry_id;
          return (
            <li
              key={m.id}
              className={`rounded-md border p-4 ${
                isMine ? "border-accent/30 bg-accent/5" : "border-border"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium text-foreground">{m.name}</p>
                {isMine && (
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
                    Mon ministère
                  </span>
                )}
              </div>
              <p className="text-sm text-muted">{descriptions[m.slug] ?? ""}</p>
            </li>
          );
        })}
      </ul>
      </section>
    </div>
  );
}
