/* eslint-disable @next/next/no-img-element -- picto décoratif de la landing */
import Link from "next/link";
import "@/app/landing.css";

/**
 * L'habillage des pages de compte, repris de la landing : l'image et une devise à gauche,
 * le contenu à droite. Sert au mot de passe oublié et à sa réinitialisation.
 */
export default function AuthShell({
  tagline,
  motto,
  children,
}: {
  tagline: string;
  motto: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="landing login-page">
      <main className="login-shell">
        <section className="login-visual" aria-label="Ministry School">
          <Link className="login-brand" href="/" aria-label="Retour à Ministry School">
            <img src="/landing/ministry-icons-transparent.png" alt="" />
            <span>Ministry School</span>
            <i aria-hidden="true" className="login-brand__sep" />
            <i role="img" aria-label="Église MLK" className="login-brand__mlk" />
          </Link>
          <div className="login-visual__copy">
            <p>{tagline}</p>
            <h2>
              {motto.map((line, i) => (
                <span key={line}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </h2>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-form-wrap">{children}</div>
        </section>
      </main>
    </div>
  );
}
