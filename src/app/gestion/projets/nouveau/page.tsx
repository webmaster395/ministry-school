import { redirect } from "next/navigation";

export default function LegacyNewProjectPage() {
  redirect("/gestion/projets-formations/nouveau");
}
