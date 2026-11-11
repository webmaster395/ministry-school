import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyIdentityToolsPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const test = (await searchParams).test;
  if (test === "fruit") redirect("/etudiant/identite/fruit-de-lesprit");
  if (test === "gifts") redirect("/etudiant/identite/dons-spirituels");
  if (test === "skills") redirect("/etudiant/identite/competences-naturelles");
  redirect("/etudiant/identite");
}
