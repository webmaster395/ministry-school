import { notFound } from "next/navigation";
import IdentityExperience, { type IdentityStoryGroup } from "@/app/etudiant/identite/IdentityExperience";

const stories: IdentityStoryGroup[] = [
  { key: "identity", label: "Identité", image: "/identity/stories/identity-v2.webp", items: [
    { key: "mapp", name: "Profil MAPP", href: "#", iconUrl: null }, { key: "fruits", name: "Fruit de l’Esprit", href: "#", iconUrl: null },
    { key: "dons", name: "Dons spirituels", href: "#", iconUrl: null }, { key: "competences", name: "Compétences naturelles", href: "#", iconUrl: null },
  ] },
  { key: "finance", label: "Finance", image: "/identity/stories/finance-v2.webp", items: [{ key: "generopoly", name: "Généropoly", href: "#", iconUrl: "/apps/generopoly.png" }] },
];

export default async function IdentityPreviewPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { state } = await searchParams;
  const results = state === "empty" ? [] : [
    { kind: "mapp" as const, completedAt: "2026-11-06T12:00:00Z", attemptId: "preview", primaryCode: "I", secondaryCode: "S" },
    { kind: "fruit" as const, completedAt: "2026-11-05T12:00:00Z" },
    { kind: "skills" as const, completedAt: "2026-11-04T12:00:00Z" },
    { kind: "gifts" as const, completedAt: "2026-11-03T12:00:00Z" },
    { kind: "generopoly" as const, completedAt: "2026-11-02T12:00:00Z" },
  ];
  const upcoming = state === "empty" ? [] : [];
  return <div style={{ minHeight: "100vh", background: "var(--surface)", padding: "clamp(16px,4vw,56px)" }}><div style={{ maxWidth: 1040, margin: "0 auto" }}><IdentityExperience fullName="Rose Martin" status="Étudiante" avatarUrl={null} studentCount={337} months={2} completedTests={results.length} stories={stories} results={results} upcoming={upcoming} /></div></div>;
}
