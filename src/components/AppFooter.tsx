// Bas de page discret des espaces (étudiant, enseignant, admin) : contrairement au
// pied de page de la landing, pas de verset ni de CTA d'inscription — on est déjà là.
export default function AppFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border-soft pt-4 text-xs text-muted">
        <p>© {new Date().getFullYear()} Ministry School · MLK Formation</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Liens de pied de page">
          <a href="/mentions-legales" className="hover:text-foreground hover:underline">
            Mentions légales
          </a>
          <a href="mailto:ministryschool@mlkgrandparis.com" className="hover:text-foreground hover:underline">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
