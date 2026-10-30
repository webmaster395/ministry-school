import Link from "next/link";
import { ArrowLeft, ArrowRight, BellRing } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDailyDigestDetails } from "@/lib/data/messages";

export default async function NotificationDigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const details = await getDailyDigestDetails(supabase, id);
  if (!details) notFound();

  const date = details.date
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(
        new Date(`${details.date}T12:00:00+01:00`),
      )
    : null;
  const groups = Array.from(
    details.items.reduce((map, item) => {
      const key = item.courseId ?? item.courseTitle;
      const current = map.get(key) ?? { id: key, title: item.courseTitle, items: [] as typeof details.items };
      current.items.push(item);
      map.set(key, current);
      return map;
    }, new Map<string, { id: string; title: string; items: typeof details.items }>()),
  ).map(([, group]) => group);

  return (
    <div className="space-y-6">
      <Link href="/etudiant/messages" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} aria-hidden="true" /> Retour aux notifications
      </Link>

      <header className="overflow-hidden rounded-3xl bg-foreground px-6 py-8 text-background sm:px-9 sm:py-10">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-on-accent">
          <BellRing size={21} aria-hidden="true" />
        </span>
        <p className="label mt-6 text-xs tracking-[0.16em] text-background/65">
          {details.frequency === "daily" ? "RÉCAPITULATIF DU JOUR" : "RÉCAPITULATIF DE LA SEMAINE"}
        </p>
        <h1 className="font-title mt-2 max-w-[720px] text-[34px] leading-tight sm:text-[44px]">
          {details.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-background/75">{details.intro}</p>
        {date && <p className="mt-3 text-sm text-background/65 capitalize">{date}</p>}
      </header>

      <section className="space-y-4 rounded-3xl border border-border bg-background p-5 sm:p-7">
        <div className="mb-5">
          <h2 className="font-title text-[24px]">Nouveautés disponibles</h2>
          <p className="mt-1 text-sm text-muted">
            Les contenus sont regroupés par cours et accessibles dès maintenant.
          </p>
        </div>
        {groups.length ? (
          groups.map((group) => (
            <article key={group.id} className="overflow-hidden rounded-2xl border border-border-soft">
              <header className="bg-surface px-4 py-3 sm:px-5">
                <h3 className="text-[16px] font-semibold leading-snug text-foreground">{group.title}</h3>
              </header>
              <ul className="divide-y divide-border-soft px-4 sm:px-5">
                {group.items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <span className="label text-[10px] tracking-[0.1em] text-muted">{item.typeLabel}</span>
                      <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">{item.title}</p>
                    </div>
                    {item.targetUrl && (
                      <Link href={item.targetUrl} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-foreground px-4 text-sm font-semibold text-foreground transition hover:bg-foreground hover:text-background">
                        Ouvrir <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))
        ) : (
          <p className="text-sm text-muted">Aucune information dans ce récapitulatif.</p>
        )}
      </section>

      <div className="flex justify-end">
        <Link href="/etudiant/cours" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-85">
          Accéder à mes cours <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
