import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import ManagedResourceForm from "@/components/admin/ManagedResourceForm";
export default function Page(){ return <AppsStudioShell active="applications"><StudioPageHeader eyebrow="GESTION DES RESSOURCES" title="Ajouter une ressource" description="Importez, rattachez, protégez puis publiez depuis un seul écran."/><ManagedResourceForm /></AppsStudioShell>; }
