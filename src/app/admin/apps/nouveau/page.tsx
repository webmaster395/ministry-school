import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import AppSettingsForm from "@/components/apps-studio/AppSettingsForm";

export default function NewCatalogAppPage() {
  return <AppsStudioShell active="applications"><StudioPageHeader eyebrow="GESTION DES OUTILS" title="Ajouter un outil" description="Créez sa fiche en brouillon, puis choisissez précisément où et quand la publier." /><AppSettingsForm /></AppsStudioShell>;
}
