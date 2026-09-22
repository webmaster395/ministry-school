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
    ];
  },
};

export default nextConfig;
