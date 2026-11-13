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
  if (pathname.startsWith("/etudiant/ressources")) return "resources";
  return null;
};

/**
 * Un seul événement par vraie navigation. Le premier écran est étalé sur une
 * minute afin que 400 arrivées ne deviennent pas 400 écritures simultanées.
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
    const recordSignIn =
      pageKey === "home" && sessionStorage.getItem("ms:just-signed-in") === "1";

    const timer = window.setTimeout(() => {
      createClient()
        .rpc("record_student_page_view", {
          p_page_key: pageKey,
          p_record_sign_in: recordSignIn,
        })
        .then(({ error }) => {
          if (!error && recordSignIn) sessionStorage.removeItem("ms:just-signed-in");
        });
    }, 15_000 + Math.random() * 60_000);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
