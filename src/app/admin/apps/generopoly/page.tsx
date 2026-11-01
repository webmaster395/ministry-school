import Link from "next/link";
import { ArrowRight, ExternalLink, Presentation, Users } from "lucide-react";
import AppsStudioShell, { StudioCard, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import { getGeneropolyOverview } from "@/lib/apps/generopoly";

export const dynamic = "force-dynamic";

export default async function GeneropolyOverviewPage() {
  let overview: Awaited<ReturnType<typeof getGeneropolyOverview>> | null = null;
  let error = "";
  try {
    overview = await getGeneropolyOverview();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Connexion à Généropoly impossible.";
  }
  if (!overview) return <AppsStudioShell active="applications" appTab="overview"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Vue d’ensemble" /><div className="rounded-[24px] border border-[#b83c13]/20 bg-white p-7 text-[#8f321c]">{error}</div></AppsStudioShell>;
  return <AppsStudioShell active="applications" appTab="overview">
      <StudioPageHeader eyebrow="GÉNÉROPOLY" title="Vue d’ensemble" description="Une lecture simple des participations définitivement enregistrées." action={<Link href="/admin/apps/generopoly/projection" target="_blank" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#20302e] px-5 py-3 font-semibold text-[#fbeeda]"><Presentation size={16} /> Projeter</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Participations validées" value={overview.completedParticipations} /><Metric label="Groupes" value={overview.groupCount} /><Metric label="Participants" value={overview.totalParticipants} /><Metric label="Dernier atelier" value={formatDate(overview.lastWorkshop)} /></div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Link href="/admin/apps/generopoly/results"><StudioCard className="group h-full"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8eeea]"><Users size={20} /></span><h2 className="mt-6 font-title text-2xl">Explorer les résultats</h2><p className="mt-2 leading-7 text-[#697572]">Comparer les choix, parcourir les groupes et retrouver leurs réponses collectives.</p><span className="mt-6 inline-flex items-center gap-2 font-semibold text-[#2c6d65]">Ouvrir <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span></StudioCard></Link>
        <a href="/apps/generopoly" target="_blank" rel="noreferrer"><StudioCard className="group h-full"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff3df]"><ExternalLink size={20} /></span><h2 className="mt-6 font-title text-2xl">Application publique</h2><p className="mt-2 leading-7 text-[#697572]">Ouvrir Généropoly tel qu’il est utilisé par les groupes pendant l’atelier.</p><span className="mt-6 inline-flex items-center gap-2 font-semibold text-[#2c6d65]">ministryschool.fr/apps/generopoly <ArrowRight size={15} /></span></StudioCard></a>
      </div>
  </AppsStudioShell>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <StudioCard><p className="text-sm text-[#6d7976]">{label}</p><strong className="mt-3 block font-title text-4xl">{value}</strong></StudioCard>; }
function formatDate(value: string | null) { return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"; }

