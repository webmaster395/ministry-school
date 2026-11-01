import AppsStudioShell, { ComingSoonEditor, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";

export default function GeneropolyEditorPage() {
  return <AppsStudioShell active="applications" appTab="editor"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Éditeur" description="Préparer les textes et scénarios sans toucher au code." /><ComingSoonEditor /></AppsStudioShell>;
}

