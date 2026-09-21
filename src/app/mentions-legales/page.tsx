/* eslint-disable @next/next/no-img-element -- picto décoratif de la landing */
import Link from "next/link";
import type { Metadata } from "next";
import "../landing.css";

export const metadata: Metadata = {
  title: "Mentions légales — Ministry School",
};

/** Mentions légales, reprises de la maquette : elles habillent la landing publique. */
export default function MentionsLegalesPage() {
  return (
    <div className="landing legal-page">
      <header className="legal-nav">
          <Link className="footer-brand" href="/" aria-label="Retour à Ministry School"><img src="/landing/ministry-icons-transparent.png" alt="" /><span>Ministry School</span></Link>
          <Link href="/">Retour au site</Link>
        </header>
        <main className="legal-main">
          <header className="legal-header">
            <p className="over">Informations légales</p>
            <h1>Mentions légales</h1>
          </header>
          <div className="legal-content">
            <section>
              <h2>Éditeur du site</h2>
              <p><strong>Raison sociale :</strong> MLK Formation</p>
              <p><strong>Forme juridique :</strong> SAS</p>
              <p><strong>Capital social :</strong> 1 000,00 €</p>
              <p><strong>SIRET :</strong> 851 941 542 00025</p>
              <p><strong>Code APE :</strong> 85.59B</p>
              <p><strong>RCS :</strong> 851 941 542 R.C.S. Créteil</p>
              <p><strong>Siège social :</strong> 2 rue Tirard, 94000 Créteil</p>
              <p><strong>Directeur de la publication :</strong> Ivan Carluer, en qualité de représentant légal de MLK Formation</p>
              <p><strong>Contact :</strong> <a href="mailto:ministryschool@mlkgrandparis.com">ministryschool@mlkgrandparis.com</a></p>
            </section>
            <section>
              <h2>Hébergement</h2>
              <p><strong>Hébergeur :</strong> Vercel Inc.</p>
              <p><strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
              <p><strong>Site web :</strong> <a href="https://vercel.com" rel="noopener noreferrer">vercel.com</a></p>
            </section>
            <section>
              <h2>Propriété intellectuelle</h2>
              <p>L’ensemble des éléments de ce site (textes, images, logos, vidéos) est la propriété exclusive de Ministry School, programme appartenant à MLK Formation, sauf mention contraire. Toute reproduction, représentation ou diffusion, en tout ou partie, sans autorisation préalable est interdite.</p>
            </section>
            <section id="donnees-personnelles">
              <h2>Données personnelles</h2>
              <p>Les informations recueillies via les formulaires de ce site sont destinées à Ministry School et à MLK Formation et font l’objet d’un traitement pour répondre à votre demande. Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d’un droit d’accès, de rectification et de suppression de vos données, à exercer par e-mail à l’adresse de contact.</p>
            </section>
            <section>
              <h2>Cookies</h2>
              <p>Ce site n’utilise pas de cookies de suivi ou de mesure d’audience tiers.</p>
            </section>
          </div>
        </main>
    </div>
  );
}
