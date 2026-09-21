import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Adresses courtes prévues pour ministryschool.fr : /connexion (l'accueil « / » est la
  // landing publique, et « /app » une page qui oriente chacun vers son espace)
  async redirects() {
    return [
      { source: "/connexion", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
