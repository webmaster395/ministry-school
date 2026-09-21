import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Jost } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Ministry School — Votre parcours de formation pour le Royaume",
  description: "Plateforme de formation Ministry School. Grandir, Servir, Impacter.",
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
      <head>{adobeFontsUrl && <link rel="stylesheet" href={adobeFontsUrl} />}</head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
