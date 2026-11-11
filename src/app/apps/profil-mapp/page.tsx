import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getIdentityDashboard } from "@/lib/identity/dashboard";
import { getOfficialMappIdentityResults } from "@/lib/mapp/official-results";

export const dynamic = "force-dynamic";

export default async function ProfilMappPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/apps/profil-mapp");
  if (viewer.deactivated) redirect("/auth/desactive");

  const dashboard = await getIdentityDashboard();
  const nativeResult = dashboard.identityResults.find((result) => result.kind === "mapp");
  const [archivedResult] = nativeResult ? [] : await getOfficialMappIdentityResults();
  const existingResult = nativeResult ?? archivedResult;
  if (existingResult?.attemptId) {
    const query = new URLSearchParams();
    if (existingResult.resultRevisionId) query.set("revision", existingResult.resultRevisionId);
    if (nativeResult) query.set("native", "1");
    else query.set("legacy", "1");
    const suffix = query.size ? `?${query.toString()}` : "";
    redirect(`/apps/profil-mapp/test/${existingResult.attemptId}/resultat${suffix}`);
  }

  return <main className="min-h-dvh bg-[radial-gradient(circle_at_22%_18%,#d9f2f4_0,transparent_32%),linear-gradient(145deg,#f5faf9,#eef4f7_52%,#f8f2e9)] px-5 py-10 text-[#153b47] sm:py-16">
    <section className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_30px_90px_rgba(29,73,86,.14)] backdrop-blur md:grid-cols-[1.15fr_.85fr]">
      <div className="p-8 sm:p-12 lg:p-16">
        <Link className="text-sm font-semibold text-[#557783] hover:underline" href="/etudiant/identite">← Retour à Mon identité</Link>
        <p className="mt-14 text-xs font-bold uppercase tracking-[.2em] text-[#16869b]">Profil MAPP · Église MLK</p>
        <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-[.98] tracking-[-.055em] text-[#123b49] sm:text-6xl">Découvre ta manière unique d’agir et de communiquer.</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[#58717a]">Le questionnaire MAPP met en lumière tes tendances naturelles et ta façon de réagir sous pression. Réponds spontanément : il n’y a ni bonne ni mauvaise réponse.</p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm text-[#45636c]">
          <span className="rounded-full bg-[#e9f6f6] px-4 py-2">44 questions</span>
          <span className="rounded-full bg-[#e9f6f6] px-4 py-2">Environ 10 minutes</span>
          <span className="rounded-full bg-[#e9f6f6] px-4 py-2">Résultat personnel</span>
        </div>
        <Link className="mt-10 inline-flex rounded-full bg-[#123b49] px-7 py-4 text-sm font-bold text-white shadow-lg shadow-[#123b49]/20 transition hover:-translate-y-0.5 hover:bg-[#0b5264]" href="/apps/profil-mapp/commencer">
          Commencer ou reprendre le test
        </Link>
      </div>
      <div className="relative min-h-80 overflow-hidden bg-[#123b49] p-10 text-white md:min-h-full">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#44c4c7]/40 blur-2xl" />
        <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#d9a3b8]/35 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between">
          <p className="text-sm font-semibold text-white/65">MAPP</p>
          <div>
            <p className="text-7xl font-semibold tracking-[-.08em] text-white/95">D · I<br/>S · C</p>
            <p className="mt-7 max-w-sm text-sm leading-6 text-white/70">Conquérant, Communiquant, Facilitateur, Analyste : quatre dynamiques qui se combinent pour raconter ton profil.</p>
          </div>
        </div>
      </div>
    </section>
  </main>;
}
