import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CSS injecté dans le <head> plutôt qu'un <link> externe : évite le flash de texte
  // non stylé (titres énormes) le temps que la feuille Tailwind se charge, surtout
  // sensible sur les premiers chargements/cold starts Vercel.
  experimental: {
    inlineCss: true,
  },
  // Adresses courtes prévues pour ministryschool.fr : /connexion (l'accueil « / » est la
  // landing publique, et « /app » une page qui oriente chacun vers son espace)
  async redirects() {
    return [
      { source: "/connexion", destination: "/login", permanent: false },
      // Anciennes adresses des pages de fonction, déplacées sous /gestion (signets, e-mails)
      { source: "/admin", destination: "/gestion/admin", permanent: false },
      { source: "/admin/:path*", destination: "/gestion/admin/:path*", permanent: false },
      { source: "/etudiant/pilotage", destination: "/gestion/pilotage", permanent: false },
      { source: "/etudiant/enseignement", destination: "/gestion/enseignement", permanent: false },
      { source: "/etudiant/preparation/:id", destination: "/gestion/enseignement/preparation/:id", permanent: false },
      { source: "/etudiant/services/nouveau", destination: "/gestion/services/nouveau", permanent: false },
      { source: "/enseignant/messages", destination: "/gestion/enseignement/messages", permanent: false },
    ];
  },
};

export default nextConfig;
