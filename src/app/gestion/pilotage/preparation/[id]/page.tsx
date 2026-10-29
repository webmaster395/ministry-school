import { PreparationPageContent } from "@/app/gestion/enseignement/preparation/[id]/page";

export default async function PilotagePreparationPage(props: { params: Promise<{ id: string }> }) {
  return PreparationPageContent({ ...props, accessMode: "pilotage" });
}
