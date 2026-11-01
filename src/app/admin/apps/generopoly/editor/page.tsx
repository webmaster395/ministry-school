import AppsStudioShell, { ComingSoonEditor, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";

export default function GeneropolyEditorPage() {
  return <AppsStudioShell active="applications" appTab="editor"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Éditeur" description="Préparer les consignes, questions, scénarios et textes sans toucher au code." /><ComingSoonEditor /></AppsStudioShell>;
}

