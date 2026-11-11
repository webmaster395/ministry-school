import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GraceIdentityPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const requestedTest = (await searchParams).test;
  const target = requestedTest === "fruit" ? "/etudiant/identite/fruit-de-lesprit"
    : requestedTest === "gifts" ? "/etudiant/identite/dons-spirituels"
      : requestedTest === "skills" ? "/etudiant/identite/competences-naturelles"
        : "/etudiant/identite";
  redirect(target);
}
