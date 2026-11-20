import { notFound } from "next/navigation";
import IdentityExperience, { type IdentityFeedItem, type IdentityStoryItem } from "@/app/etudiant/identite/IdentityExperience";

const stories: IdentityStoryItem[] = [
  { key: "mapp", name: "Profil MAPP", category: "Identité", href: "#", image: "/identity/stories/identity-v2.webp", status: "completed", measurable: true },
  { key: "heroes", name: "Test des héros", category: "Identité", href: "#", image: "/identity/stories/identity.webp", status: "completed", measurable: true },
  { key: "fruit", name: "Fruit de l’Esprit", category: "Identité", href: "#", image: "/apps/grace-identity/fruit-spirit-blue-violet-grape-post-v26.png", status: "completed", measurable: true },
  { key: "gifts", name: "Dons spirituels", category: "Identité", href: "#", image: "/identity/posts/dons-spirituels.webp", status: "not-started", measurable: true },
  { key: "skills", name: "Compétences naturelles", category: "Identité", href: "#", image: "/identity/posts/competences-naturelles.webp", status: "not-started", measurable: true },
  { key: "life-line", name: "Ma ligne de vie", category: "Identité", href: "#", image: "/identity/posts/ligne-de-vie.webp", status: "not-started", measurable: true },
  { key: "try", name: "À tester", category: "Finance", href: "#", image: "/identity/stories/finance-v2.webp", status: "available", measurable: false, links: [
    { name: "Généropoly", href: "#" },
    { name: "Simulateur de générosité", href: "#" },
  ] },
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
  const feed: IdentityFeedItem[] = state === "empty" ? [] : [
    { type: "todo", key: "todo-preview", todo: { key: "preview", appId: "preview", name: "Test des héros", description: "Découvre les personnes qui t’inspirent et ce qui te met en mouvement.", href: "#", imageUrl: "/identity/heroes/dove-abstract-v1.webp", category: "Identité", importance: "priority", order: 0, external: false } },
    ...results.map((result) => ({ type: "result" as const, key: `result-${result.kind}-${result.completedAt}`, result })),
  ];
  return <div style={{ minHeight: "100vh", background: "var(--surface)", padding: "clamp(16px,4vw,56px)" }}><div style={{ maxWidth: 1040, margin: "0 auto" }}><IdentityExperience userId="preview-user" fullName="Rose Martin" status="Aimée" avatarUrl={null} studentCount={337} months={2} completedTests={results.length} stories={stories} feed={feed} /></div></div>;
}
