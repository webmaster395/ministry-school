"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const trackedPage = (pathname: string) => {
  if (pathname === "/etudiant") return "home";
  if (pathname === "/etudiant/cours") return "courses";
  if (pathname.startsWith("/etudiant/cours/") || pathname.startsWith("/etudiant/seances/")) return "course_detail";
  if (pathname.startsWith("/etudiant/travail")) return "assignments";
  if (pathname.startsWith("/etudiant/profil")) return "profile";
  if (pathname.startsWith("/etudiant/notes")) return "notes";
  if (pathname.startsWith("/etudiant/services")) return "services_projects";
  return null;
};

/**
 * Un seul événement par vraie navigation. Un délai aléatoire évite une rafale
 * d'écritures lorsque plusieurs centaines d'étudiants arrivent ensemble.
 */
export default function StudentUsageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const pageKey = trackedPage(pathname);
    if (!pageKey) return;

    const storageKey = `ms:view:${pageKey}`;
    const previous = Number(sessionStorage.getItem(storageKey) ?? 0);
    if (Date.now() - previous < 30_000) return;
    sessionStorage.setItem(storageKey, String(Date.now()));

    const timer = window.setTimeout(() => {
      createClient().rpc("record_student_page_view", { p_page_key: pageKey }).then(() => undefined);
    }, 2_000 + Math.random() * 6_000);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
