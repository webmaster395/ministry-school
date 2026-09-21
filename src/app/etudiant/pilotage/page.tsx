import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { buildRows, getMinistrySessions, getSteeredMinistries } from "@/lib/data/pilotage";
import { getMinistry } from "@/lib/ministry";
import MinistryPicto from "@/components/MinistryPicto";
import PrepBoard, { type PrepTab } from "@/components/PrepBoard";

export default async function PilotagePage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; m?: string }>;
}) {
  const { onglet, m } = await searchParams;
  const tab: PrepTab = onglet === "avenir" || onglet === "passes" ? onglet : "prochain";

  const viewer = await getViewer();
  if (!viewer || (!viewer.roles.admin && viewer.roles.steeringMinistryIds.length === 0)) redirect("/etudiant");

  const supabase = await createClient();
  // L'administrateur pilote tous les ministères ; les autres, ceux qui leur sont confiés.
  const ministryIds = viewer.roles.admin
    ? ((await supabase.from("ministries").select("id")).data ?? []).map((m) => m.id as string)
    : viewer.roles.steeringMinistryIds;
  const steered = await getSteeredMinistries(supabase, ministryIds);
  const ministry = steered.find((x) => x.slug === m) ?? steered[0];
  if (!ministry) redirect("/etudiant");

  const rows = await buildRows(supabase, await getMinistrySessions(supabase, ministry.id), "pilotage");

  const requiredDone = rows.reduce((n, r) => n + r.progress.requiredDone, 0);
  const requiredTotal = rows.reduce((n, r) => n + r.progress.requiredTotal, 0);
  const percent = requiredTotal ? Math.round((requiredDone / requiredTotal) * 100) : 0;
  const color = getMinistry(ministry.slug)?.color ?? "var(--border)";

  const hrefFor = (t: PrepTab) => {
    const q = new URLSearchParams();
    if (t !== "prochain") q.set("onglet", t);
    if (steered.length > 1) q.set("m", ministry.slug);
    const s = q.toString();
    return `/etudiant/pilotage${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      {steered.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {steered.map((x) => (
            <Link
              key={x.id}
              href={`/etudiant/pilotage?m=${x.slug}`}
              className={`rounded-lg px-4 py-2 text-sm ${
                x.id === ministry.id
                  ? "bg-accent font-medium text-on-accent"
                  : "border border-border bg-background text-muted"
              }`}
            >
              {x.name}
            </Link>
          ))}
        </div>
      )}

      <section className="grid gap-6 rounded-lg border border-border bg-background p-6 md:grid-cols-[1fr_360px] md:divide-x md:divide-border-soft">
        <div>
          <p className="text-sm text-muted">Ministère supervisé</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${color} 30%, transparent)` }}
            >
              <MinistryPicto slug={ministry.slug} size={22} />
            </span>
            <h2 className="font-title text-[26px] leading-tight text-foreground">{ministry.name}</h2>
          </div>
        </div>
        <div className="md:pl-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted">Préparation du programme</p>
            <p className="font-title text-[26px] text-foreground">{percent} %</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </section>

      <PrepBoard
        tab={tab}
        hrefFor={hrefFor}
        rows={rows}
        ministryColor={color}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
