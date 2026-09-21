import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Adresses courtes prévues pour ministryschool.fr : /app (connecté) et /connexion
  async redirects() {
    return [
      { source: "/app", destination: "/etudiant", permanent: false },
      { source: "/connexion", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
