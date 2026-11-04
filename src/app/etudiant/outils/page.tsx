/* eslint-disable @next/next/no-img-element -- icônes du catalogue importées par les administrateurs */
import { ArrowUpRight, PanelsTopLeft } from "lucide-react";
import { getStudentTools, getStudentToolsEnabled } from "@/lib/apps/catalog";

export const dynamic = "force-dynamic";

export default async function StudentToolsPage() {
  const enabled = await getStudentToolsEnabled();
  const apps = enabled ? await getStudentTools() : [];

  return <div className="space-y-7">
    <header>
      <p className="label text-[11px] text-muted">MON PARCOURS</p>
      <h1 className="mt-2 font-title text-4xl tracking-tight sm:text-5xl">Mes outils</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted">Retrouve ici les applications pédagogiques mises à ta disposition.</p>
    </header>

    {apps.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => <a key={app.id} href={app.url} target={app.url.startsWith("http") ? "_blank" : undefined} rel={app.url.startsWith("http") ? "noreferrer" : undefined} className="group flex min-h-52 flex-col rounded-[24px] border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(32,48,46,.08)] sm:p-6">
        <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-surface">
          {app.iconUrl ? <img src={app.iconUrl} alt="" className="h-full w-full object-contain" /> : <PanelsTopLeft size={24} strokeWidth={1.5} />}
        </span>
        <span className="mt-6 flex items-start justify-between gap-4"><span><span className="label text-[10px] text-muted">{app.category}</span><strong className="mt-1 block font-title text-2xl">{app.name}</strong></span><ArrowUpRight className="mt-1 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={18} /></span>
        {app.description && <span className="mt-3 block text-sm leading-6 text-muted">{app.description}</span>}
      </a>)}
    </div> : <div className="rounded-[24px] border border-dashed border-border bg-background p-8 text-center sm:p-12"><PanelsTopLeft className="mx-auto text-muted" size={28} strokeWidth={1.4} /><h2 className="mt-4 font-title text-2xl">Aucun outil disponible pour le moment.</h2></div>}
  </div>;
}
