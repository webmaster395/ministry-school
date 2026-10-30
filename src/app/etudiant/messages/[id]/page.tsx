import Link from "next/link";
import { ArrowLeft, ArrowRight, BellRing } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDailyDigestDetails } from "@/lib/data/messages";

const labels: Record<string, string> = {
  course: "Cours",
  opportunity: "Projet ou formation",
  video: "Vidéo ou replay",
  material: "Support",
  assignment: "Devoir",
  deadline: "Échéance",
  planning: "Planning",
  workflow: "À traiter",
};

export default async function DailyDigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const details = await getDailyDigestDetails(supabase, id);
  if (!details) notFound();

  const date = details.date
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(
        new Date(`${details.date}T12:00:00+01:00`),
      )
    : null;

  return (
    <div className="space-y-6">
      <Link href="/etudiant/messages" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} aria-hidden="true" /> Retour aux notifications
      </Link>

      <header className="overflow-hidden rounded-3xl bg-foreground px-6 py-8 text-background sm:px-9 sm:py-10">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-on-accent">
          <BellRing size={21} aria-hidden="true" />
        </span>
        <p className="label mt-6 text-xs tracking-[0.16em] text-background/65">RÉCAPITULATIF QUOTIDIEN</p>
        <h1 className="font-title mt-2 max-w-[720px] text-[34px] leading-tight sm:text-[44px]">
          Du nouveau dans Ministry School
        </h1>
        {date && <p className="mt-3 text-sm text-background/65 capitalize">{date}</p>}
      </header>

      <section className="rounded-3xl border border-border bg-background p-5 sm:p-7">
        <div className="mb-5">
          <h2 className="font-title text-[24px]">Toutes les informations du jour</h2>
          <p className="mt-1 text-sm text-muted">
            Chaque nouveauté n’apparaît qu’une seule fois et respecte vos accès et préférences.
          </p>
        </div>
        {details.items.length ? (
          <ul className="divide-y divide-border-soft">
            {details.items.map((item) => (
              <li key={item.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <span className="label inline-flex rounded-full bg-surface px-3 py-1 text-[10px] tracking-[0.1em] text-muted">
                      {labels[item.category] ?? "Information"}
                    </span>
                    <h3 className="mt-2 text-[17px] font-semibold leading-snug text-foreground">{item.title}</h3>
                    {item.body && <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>}
                  </div>
                  {item.targetUrl && (
                    <Link
                      href={item.targetUrl}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-foreground px-4 text-sm font-semibold text-foreground transition hover:bg-foreground hover:text-background"
                    >
                      Ouvrir <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucune information dans ce récapitulatif.</p>
        )}
      </section>
    </div>
  );
}
