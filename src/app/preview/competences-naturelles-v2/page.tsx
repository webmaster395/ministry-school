"use client";

import { useState } from "react";
import NaturalSkillsJourney, { type NaturalSkillsScreen } from "@/components/apps/NaturalSkillsJourney";

const pages: Array<{ label: string; screen: NaturalSkillsScreen; domain?: number }> = [
  { label: "Accueil", screen: "intro" },
  ...Array.from({ length: 8 }, (_, index) => ({ label: `Domaine ${index + 1}`, screen: "domains" as const, domain: index })),
  { label: "Priorités", screen: "priorities" },
  { label: "Bilan", screen: "overview" },
  { label: "Chapitre 1", screen: "forces" },
  { label: "Chapitre 2", screen: "growth" },
  { label: "Chapitre 3", screen: "service" },
];

export default function NaturalSkillsPreviewPage() {
  const [page, setPage] = useState(pages[0]);
  return <>
    <NaturalSkillsJourney key={`${page.screen}-${page.domain ?? 0}`} initial={{}} saving={false} sample previewScreen={page.screen} previewDomain={page.domain} onBack={() => undefined} onSave={async () => undefined} />
    <aside style={{ position: "fixed", zIndex: 100, left: 12, right: 12, bottom: 12, display: "flex", gap: 6, padding: 8, overflowX: "auto", borderRadius: 18, background: "rgba(15,24,21,.94)", boxShadow: "0 10px 30px rgba(0,0,0,.22)" }} aria-label="Pages de la prévisualisation">
      {pages.map((item) => <button key={`${item.screen}-${item.domain ?? 0}`} type="button" onClick={() => setPage(item)} style={{ flex: "0 0 auto", minHeight: 38, border: 0, borderRadius: 999, padding: "0 14px", color: page === item ? "#17201d" : "white", background: page === item ? "#e9efe9" : "transparent", fontWeight: 700, cursor: "pointer" }}>{item.label}</button>)}
    </aside>
  </>;
}
