import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Jost } from "next/font/google";
import "./globals.css";
import InstallBanner from "@/components/InstallBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const description =
  "Une année pour découvrir ton appel, développer tes dons et passer de l'intention à l'action.";

/**
 * Métadonnées communes, dont l'aperçu partagé sur WhatsApp, LinkedIn, Facebook ou X.
 * L'image vient des fichiers opengraph-image.png et twitter-image.png du dossier app/ :
 * Next.js en déduit seul les balises de taille, de type et de texte alternatif.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ministryschool.fr"),
  title: "Ministry School — Votre parcours de formation pour le Royaume",
  description,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Ministry School",
    title: "Ministry School",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ministry School",
    description,
  },
};

// Titres : Etna quand elle est disponible (fichier local ou Adobe Fonts : renseigner
// NEXT_PUBLIC_ADOBE_FONTS_URL), sinon Bricolage Grotesque, libre de droits.
const adobeFontsUrl = process.env.NEXT_PUBLIC_ADOBE_FONTS_URL;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${jost.variable} ${bricolage.variable} h-full antialiased`}>
      <head>
        {adobeFontsUrl && <link rel="stylesheet" href={adobeFontsUrl} />}
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#27302f" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ministry School" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <InstallBanner />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
