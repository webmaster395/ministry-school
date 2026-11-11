import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GraceIdentityPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const requestedTest = (await searchParams).test;
  const query = requestedTest === "fruit" || requestedTest === "gifts" || requestedTest === "skills"
    ? `?test=${requestedTest}`
    : "";
  redirect(`/etudiant/identite/outils${query}`);
}
