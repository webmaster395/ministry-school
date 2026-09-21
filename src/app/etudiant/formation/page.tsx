import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChevronRight, CircleUser, Heart, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MinistryPicto from "@/components/MinistryPicto";
import MinistryLabels from "@/components/MinistryLabels";
import { getMinistry, MINISTRIES } from "@/lib/ministry";
import { MINISTRY_PROFILES, MINISTRY_RESOURCES } from "@/lib/ministry-content";
import { changeMinistry } from "./actions";

type Tab = "decouvrir" | "choix" | "programme";

const VIDEO_ID = "gSRxq7xwN_c";

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "decouvrir", label: "Découvrir", href: "/etudiant/formation?onglet=decouvrir" },
  { key: "choix", label: "Mon choix", href: "/etudiant/formation" },
  { key: "programme", label: "Mon programme", href: "/etudiant/formation?onglet=programme" },
];

const descriptions: Record<string, string> = {
  apotre: "Fondation, envoi et implantation — poser des bases solides pour l'œuvre.",
  prophete: "Écoute et direction — discerner et transmettre ce que dit l'Esprit.",
  evangeliste: "Annonce et transmission — porter la bonne nouvelle à l'extérieur.",
  pasteur: "Accompagnement et soin — prendre soin du troupeau au quotidien.",
  docteur: "Enseignement et formation — structurer et transmettre la connaissance.",
};

const ORDER = ["apotre", "prophete", "evangeliste", "pasteur", "docteur"];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const RESOURCE_ICONS = {
  book: <BookOpen size={20} strokeWidth={1.6} />,
  user: <CircleUser size={20} strokeWidth={1.6} />,
  heart: <Heart size={20} strokeWidth={1.6} />,
};

export default async function StudentFormationPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { onglet } = await searchParams;
  // On arrive sur « Mon choix » : c'est la sensibilité de la personne qui compte en premier.
  // Sans choix, cet onglet présente les cinq sensibilités pour aider à choisir.
  const tab: Tab = onglet === "decouvrir" || onglet === "programme" ? onglet : "choix";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: ministries }, { data: profile }] = await Promise.all([
    supabase.from("ministries").select("id, slug, name").order("name"),
    supabase.from("profiles").select("ministry_id").eq("id", user!.id).single(),
  ]);

  const mine = (ministries ?? []).find((m) => m.id === profile?.ministry_id) ?? null;
  const info = getMinistry(mine?.slug);
  const content = mine ? MINISTRY_PROFILES[mine.slug] : null;

  const discover = (
    <div className="space-y-8">
      <div className="max-w-[760px]">
        <h2 className="font-title text-[26px] leading-tight text-foreground">
          Comprendre les ministères
        </h2>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">
          Dans la Bible, les ministères sont des manières complémentaires de servir Dieu, de
          prendre soin des autres et de participer à l&apos;édification de l&apos;Église. Chaque
          personne peut développer une sensibilité particulière, tout en étant appelée à grandir
          dans l&apos;ensemble de son service.
        </p>
      </div>

      <MinistryLabels
        ministries={ORDER.map((k) => ({
          slug: k,
          name: MINISTRIES[k].name,
          description: descriptions[k] ?? "",
          profile: MINISTRY_PROFILES[k] ?? null,
        }))}
      />

      <div className="max-w-[640px] overflow-hidden rounded-lg border border-border bg-background">
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`}
            title="Ministère(s)… Qu'en dit la Bible ?"
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>

      <section>
        <h3 className="font-title mb-4 text-[22px] text-foreground">Les cinq sensibilités</h3>
        <ul className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {ORDER.map((k) => (ministries ?? []).find((m) => m.slug === k))
            .filter((m): m is NonNullable<typeof m> => !!m)
            .map((m) => {
              const mi = getMinistry(m.slug);
              const isMine = m.id === profile?.ministry_id;
              const color = mi?.color ?? "var(--border)";
              return (
                <li
                  key={m.id}
                  className="overflow-hidden rounded-lg border border-border border-t-[3px] bg-background"
                  style={{
                    borderTopColor: color,
                    ...(isMine && { borderColor: color, borderTopColor: color }),
                  }}
                >
                  <Image
                    src={`/ministeres/${m.slug}-v2.jpg`}
                    alt={`Ministry School — sensibilité ${mi?.adjective ?? m.name}`}
                    width={1080}
                    height={1080}
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <MinistryPicto slug={m.slug} size={24} />
                      <h4 className="font-title text-xl leading-tight text-foreground">{m.name}</h4>
                      {isMine && (
                        <span className="label rounded-full border border-foreground/30 px-2.5 py-0.5 text-[10px] tracking-[0.12em] text-foreground">
                          Mon ministère
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-normal text-muted">
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

  const choice = (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="grid lg:grid-cols-[1fr_340px]">
          <div className="p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {mine && info ? (
                <span
                  className="label inline-flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-4 text-[11px] tracking-[0.1em] text-foreground"
                  style={{ background: `color-mix(in srgb, ${info.color} 35%, transparent)` }}
                >
                  <MinistryPicto slug={mine.slug} size={16} />
                  Sensibilité {info.adjective}
                </span>
              ) : (
                <span className="label text-[11px] tracking-[0.1em] text-muted">
                  Aucune sensibilité choisie
                </span>
              )}

              <details className="group relative" open={!mine}>
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[15px] text-muted transition hover:text-foreground">
                  <Pencil size={16} strokeWidth={1.7} />
                  {mine ? "Modifier ma sensibilité" : "Choisir ma sensibilité"}
                </summary>
                <form
                  action={changeMinistry}
                  className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface p-3"
                >
                  <select
                    name="ministry_id"
                    defaultValue={mine?.id ?? ""}
                    required
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      Choisir…
                    </option>
                    {ORDER.map((k) => (ministries ?? []).find((m) => m.slug === k))
                      .filter((m): m is NonNullable<typeof m> => !!m)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {capitalize(MINISTRIES[m.slug]?.adjective ?? m.name)}
                        </option>
                      ))}
                  </select>
                  <button
                    type="submit"
                    className="label rounded-md bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221]"
                  >
                    Enregistrer
                  </button>
                </form>
              </details>
            </div>

            {mine && info && content ? (
              <>
                <h2 className="font-title mt-5 text-[30px] leading-tight text-foreground">
                  {capitalize(info.adjective)}
                </h2>
                <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed text-muted">
                  {content.intro}
                </p>

                <div className="mt-7 border-t border-border-soft pt-6">
                  <h3 className="font-title text-[22px] text-foreground">
                    Mieux comprendre ma sensibilité
                  </h3>
                  <dl className="mt-5 grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border-soft">
                    <Col title="Ce qui vous anime" text={content.anime} first />
                    <Col title="Votre contribution" text={content.contribution} />
                    <Col title="Votre point de vigilance" text={content.vigilance} />
                  </dl>
                </div>
              </>
            ) : (
              <p className="mt-5 max-w-[560px] text-[16px] leading-relaxed text-muted">
                Choisissez la sensibilité qui vous ressemble le plus : votre parcours de
                Sensibilité ministérielle sera adapté à cette orientation à partir de janvier.
              </p>
            )}
          </div>

          {mine && (
            <div className="hidden p-7 pl-0 lg:block">
              <Image
                src={`/ministeres/${mine.slug}-v2.jpg`}
                alt={`Sensibilité ${info?.adjective ?? mine.name}`}
                width={1080}
                height={1080}
                sizes="340px"
                className="aspect-square w-full rounded-lg object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {!mine && (
        <section>
          <h3 className="font-title mb-1 text-[22px] text-foreground">Laquelle vous ressemble ?</h3>
          <p className="mb-4 max-w-[640px] text-[15px] text-muted">
            Lisez les cinq sensibilités, puis choisissez celle qui vous parle le plus. Vous pourrez la
            modifier plus tard.
          </p>
          <ul className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {ORDER.map((k) => (ministries ?? []).find((m) => m.slug === k))
              .filter((m): m is NonNullable<typeof m> => !!m)
              .map((m) => {
                const mi = getMinistry(m.slug);
                const profileContent = MINISTRY_PROFILES[m.slug];
                return (
                  <li
                    key={m.id}
                    className="flex flex-col overflow-hidden rounded-lg border border-border border-t-[3px] bg-background"
                    style={{ borderTopColor: mi?.color ?? "var(--border)" }}
                  >
                    <Image
                      src={`/ministeres/${m.slug}-v2.jpg`}
                      alt={`Ministry School — sensibilité ${mi?.adjective ?? m.name}`}
                      width={1080}
                      height={1080}
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-2">
                        <MinistryPicto slug={m.slug} size={24} />
                        <h4 className="font-title text-xl leading-tight text-foreground">{m.name}</h4>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">{descriptions[m.slug] ?? ""}</p>
                      {profileContent && (
                        <p className="mt-2 text-sm leading-normal text-muted">{profileContent.anime}</p>
                      )}
                      <form action={changeMinistry} className="mt-auto pt-4">
                        <input type="hidden" name="ministry_id" value={m.id} />
                        <button
                          type="submit"
                          className="label w-full rounded-full border border-foreground px-4 py-2.5 text-[11px] tracking-[0.12em] text-foreground transition hover:bg-accent hover:text-on-accent"
                        >
                          Choisir cette sensibilité
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {mine && (
      <section>
        <h3 className="font-title mb-3 text-[22px] text-foreground">Ressources pour ma sensibilité</h3>
        <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
          {MINISTRY_RESOURCES.map((r) => {
            const row = (
              <>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface text-foreground">
                  {RESOURCE_ICONS[r.icon]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-foreground">{r.title}</span>
                  <span className="block text-sm text-muted">{r.description}</span>
                </span>
                <span
                  className={`flex shrink-0 items-center gap-1 text-sm font-semibold ${
                    r.href ? "text-foreground" : "text-muted"
                  }`}
                >
                  {r.href ? r.action : "Bientôt"}
                  {r.href && <ChevronRight size={16} />}
                </span>
              </>
            );
            return (
              <li key={r.title}>
                {r.href ? (
                  <Link href={r.href} className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface">
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      )}
    </div>
  );

  const program = (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="font-title text-[22px] text-foreground">Mon programme</h2>
      <p className="mt-2 text-[15px] text-muted">
        Le programme de votre ministère sera disponible ici à partir de janvier.
      </p>
    </section>
  );

  return (
    <div className="space-y-6">
      <nav className="grid max-w-[1120px] grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`rounded-md py-3 text-center text-[15px] transition ${
              tab === t.key
                ? "bg-accent font-medium text-on-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "decouvrir" ? discover : tab === "choix" ? choice : program}
    </div>
  );
}

function Col({ title, text, first = false }: { title: string; text: string; first?: boolean }) {
  return (
    <div className={first ? "sm:pr-6" : "sm:px-6"}>
      <dt className="text-[16px] font-semibold text-foreground">{title}</dt>
      <dd className="mt-3 text-[15px] leading-relaxed text-muted">{text}</dd>
    </div>
  );
}
