import Link from "next/link";

// Bas de page discret des espaces (étudiant, enseignant, admin) : contrairement au
// pied de page de la landing, pas de verset ni de CTA d'inscription — on est déjà là.
export default function AppFooter() {
  return (
    <footer className="w-full border-t border-border-soft bg-surface">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs text-muted sm:px-7">
        <p>© {new Date().getFullYear()} Ministry School · MLK Formation</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Liens de pied de page">
          <Link href="/mentions-legales" className="hover:text-foreground hover:underline">
            Mentions légales
          </Link>
          <Link href="/mentions-legales#donnees-personnelles" className="hover:text-foreground hover:underline">
            Confidentialité
          </Link>
          <a href="mailto:ministryschool@mlkgrandparis.com" className="hover:text-foreground hover:underline">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
