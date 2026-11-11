import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function MappLanding() {
  return <main className="entry-experience entry-landing">
    <header className="landing-header">
      <div className="entry-signature" aria-label="Profil MAPP, Église MLK">
        <span className="mapp-logo-marks" aria-hidden="true">
          <i className="mapp-mark mapp-mark-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m3 18 6-8 4 5 5-9 4 12" /></svg></i>
          <i className="mapp-mark mapp-mark-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 21v-9M12 15C6 15 4 11 5 5c6 1 8 4 7 10Zm0 3c6 0 8-4 7-10-6 1-8 4-7 10Z" /></svg></i>
          <i className="mapp-mark mapp-mark-yellow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12c6-7 12-7 18 0-6 7-12 7-18 0Zm18 0 3-4m-3 4 3 4" /></svg></i>
          <i className="mapp-mark mapp-mark-red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 18 11-11 2-1-1 3L7 20H4v-3l2 1Zm-1-5 6 6" /></svg></i>
        </span>
        <b className="mapp-wordmark"><span>Profil</span> mapp<i>.</i></b><span className="signature-separator"/><span>Église MLK</span>
      </div>
      <Link className="landing-back-link" href="/etudiant/identite">Mon identité</Link>
    </header>
    <section className="landing-hero">
      <p className="entry-kicker">Proposé par l’Église MLK</p>
      <h1>Découvre comment tu fonctionnes.</h1>
      <p className="landing-lead">Explore ta manière de penser, d&apos;agir et d&apos;interagir avec les autres.<br />Découvre tes moteurs, tes modes de communication, tes réactions et les différentes facettes de ta personnalité.</p>
      <Link className="landing-cta" href="/apps/profil-mapp/commencer">
        Découvrir mon profil <ArrowRight size={18} />
      </Link>
      <section className="profile-preview" aria-label="Les quatre profils MAPP">
        <article className="profile-card profile-card-moses"><div className="profile-card-content"><div className="profile-symbol" aria-hidden="true"><b>M</b><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="m3 37 13-16 8 9 9-16 12 23" /></svg></div><strong>Moïse <span>· Analyste</span></strong><span className="profile-rule"/><small>Analyser avec précision</small></div></article>
        <article className="profile-card profile-card-abraham"><div className="profile-card-content"><div className="profile-symbol" aria-hidden="true"><b>A</b><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M24 43V25M24 30C12 30 7 23 8 10c12 1 17 8 16 20Zm0 5c12 0 17-7 16-20-12 1-17 8-16 20Z" /></svg></div><strong>Abraham <span>· Facilitateur</span></strong><span className="profile-rule"/><small>Faciliter avec confiance</small></div></article>
        <article className="profile-card profile-card-pierre"><div className="profile-card-content"><div className="profile-symbol" aria-hidden="true"><b>P</b><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M4 24c11-14 24-14 36 0-12 14-25 14-36 0Zm36 0 6-8m-6 8 6 8" /><circle cx="15" cy="23" r="1.5" fill="currentColor" stroke="none" /></svg></div><strong>Pierre <span>· Communiquant</span></strong><span className="profile-rule"/><small>Communiquer avec passion</small></div></article>
        <article className="profile-card profile-card-paul"><div className="profile-card-content"><div className="profile-symbol" aria-hidden="true"><b>P</b><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7h24a6 6 0 0 1 6 6v3h-7v-3a6 6 0 0 0-6-6M12 7a6 6 0 0 0-6 6v23a6 6 0 0 0 6 6h23V16M12 42a6 6 0 0 0 6-6V13M23 19h13M23 26h10" /></svg></div><strong>Paul <span>· Conquérant</span></strong><span className="profile-rule"/><small>Conquérir avec détermination</small></div></article>
      </section>
    </section>
  </main>;
}
