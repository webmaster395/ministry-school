import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import GeneropolyEditor from "@/components/apps-studio/GeneropolyEditor";
import { getGeneropolyContent } from "@/lib/apps/generopoly";

export const dynamic = "force-dynamic";

export default async function GeneropolyEditorPage() {
  let initial: Awaited<ReturnType<typeof getGeneropolyContent>> | null = null;
  let error = "";
  try {
    initial = await getGeneropolyContent();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Connexion à Généropoly impossible.";
  }
  return <AppsStudioShell active="applications" appTab="editor"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Édition" description={initial ? "Sélectionnez une page réelle du parcours, modifiez son contenu et contrôlez immédiatement son aperçu." : undefined} />{initial ? <GeneropolyEditor initial={initial} /> : <div className="rounded-[22px] border border-[#b83c13]/20 bg-white p-6 text-[#8f321c]">{error}</div>}</AppsStudioShell>;
}

