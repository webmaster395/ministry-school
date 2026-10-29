import { redirect } from "next/navigation";

export default function LegacyNewTrainingPage() {
  redirect("/gestion/projets-formations/nouveau");
}
