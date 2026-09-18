import { createClient } from "@/lib/supabase/server";
import MinistryPicto from "@/components/MinistryPicto";
import { getMinistry } from "@/lib/ministry";

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
    <div className="space-y-5">
      {/* PHASE 1 : Tronc commun */}
      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <div
          className="flex flex-wrap items-end justify-between gap-5 bg-cover bg-center px-6 py-[22px]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(39,48,47,.93), rgba(39,48,47,.6)), url('/texture-prophetique.png')",
          }}
        >
          <div>
            <p className="label text-[11px] tracking-[0.2em] text-[rgba(251,238,218,0.7)]">
              Phase 1
            </p>
            <h2 className="font-title text-[26px] leading-tight text-on-accent">Tronc commun</h2>
          </div>
          <span className="label rounded-full border border-[rgba(251,238,218,0.35)] px-3 py-1 text-[11px] tracking-[0.12em] text-on-accent">
            Octobre → Décembre
          </span>
        </div>

        <div className="p-6">
          <p className="mb-4 text-[15px] leading-relaxed text-muted">
            Enseignement commun à tous les ministères, un week-end par mois à l’
            <strong className="font-semibold text-foreground">Espace Grand Paris</strong>. Plénière
            le matin et ateliers de mise en pratique. Salles disponibles : Giroud, Rosa Parks,
            Denis.
          </p>

          <div className="rounded-md border-l-4 border-m-doctoral bg-surface p-4">
            <span className="label text-[11px] tracking-[0.16em] text-link">
              Ce samedi 19 septembre
            </span>
            <p className="mt-1 font-title text-xl text-foreground">Le caractère</p>
            <p className="mt-0.5 text-[15px] text-foreground">
              Intervenant : <strong className="font-semibold">Paul Goulet</strong>
            </p>
            <p className="mt-1 text-sm text-muted">
              Lieu : <strong className="font-semibold text-foreground">MLK 2</strong> (MLK Studio)
              · Horaires : 09h30 – 17h00 · Tronc commun tous ministères
            </p>
          </div>
        </div>
      </section>

      {/* PHASE 2 : Ministères */}
      <section className="rounded-lg border border-border bg-background p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="label text-xs tracking-[0.18em] text-muted">Phase 2 — Par ministère</h2>
          <span className="label rounded-full border border-border px-3 py-1 text-[11px] tracking-[0.12em] text-muted">
            À partir de janvier
          </span>
        </div>
        <p className="mb-6 text-[15px] leading-relaxed text-muted">
          À partir de janvier, les cours se poursuivent par ministère à{" "}
          <strong className="font-semibold text-foreground">MLK 2</strong> (= MLK Studio), le
          samedi et le dimanche (mêmes contenus, au choix de l&apos;étudiant).
        </p>

        <ul className="grid gap-3.5 sm:grid-cols-2">
          {(ministries ?? []).map((m) => {
            const info = getMinistry(m.slug);
            const isMine = m.id === profile?.ministry_id;
            const color = info?.color ?? "var(--border)";

            return (
              <li
                key={m.id}
                className="flex gap-4 rounded-lg border border-border border-t-[3px] p-5"
                style={{
                  borderTopColor: color,
                  ...(isMine && {
                    background: `color-mix(in srgb, ${color} 6%, transparent)`,
                    borderColor: `color-mix(in srgb, ${color} 50%, transparent)`,
                    borderTopColor: color,
                  }),
                }}
              >
                <MinistryPicto slug={m.slug} size={34} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-title text-xl leading-tight text-foreground">{m.name}</h3>
                    {isMine && (
                      <span className="label rounded-full border border-[#a0700a]/40 px-2.5 py-0.5 text-[10px] tracking-[0.12em] text-[#a0700a]">
                        Mon ministère
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-normal text-muted">
                    {descriptions[m.slug] ?? ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
