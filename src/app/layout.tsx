import type { Metadata } from "next";
import { Geist, Jost } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Ministry School — Votre parcours de formation pour le Royaume",
  description: "Plateforme de formation Ministry School. Grandir, Servir, Impacter.",
};

// Etna est servie par Adobe Fonts : renseigner l'adresse du projet Web
// (https://use.typekit.net/XXXXXXX.css) dans NEXT_PUBLIC_ADOBE_FONTS_URL.
// Sans elle, les titres s'affichent dans la serif de secours.
const adobeFontsUrl = process.env.NEXT_PUBLIC_ADOBE_FONTS_URL;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${jost.variable} h-full antialiased`}>
      <head>{adobeFontsUrl && <link rel="stylesheet" href={adobeFontsUrl} />}</head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
