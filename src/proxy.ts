import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Route locale de contrôle visuel du livret MAPP. Elle répond elle-même 404 en
  // production et ne doit pas dépendre d'une session Supabase pour la QA locale.
  if (request.nextUrl.pathname === "/api/preview/mapp-pdf" && process.env.NODE_ENV !== "production") {
    return NextResponse.next({ request });
  }
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Vérifie la signature du JWT localement avec les clés JWKS mises en cache.
  // Le layout résout ensuite l'utilisateur complet une seule fois pour le rendu.
  const { data: auth } = await supabase.auth.getClaims();
  const isAuthenticated = !!auth?.claims?.sub;

  // La création de compte n'est pas publique : son lien n'est communiqué qu'après le paiement.
  // « /inscription » lui-même reste fermé à tous ; seule l'adresse secrète INSCRIPTION_CHEMIN
  // (ex. /bienvenue-2026) y mène. Sans variable configurée, personne ne peut créer de compte.
  const signupPath = process.env.INSCRIPTION_CHEMIN;
  const isSecretSignupLink = !!signupPath && request.nextUrl.pathname === `/${signupPath}`;
  if (isSecretSignupLink) {
    const url = request.nextUrl.clone();
    url.pathname = "/inscription";
    return NextResponse.rewrite(url);
  }
  const isSignup = request.nextUrl.pathname === "/inscription";
  if (isSignup) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const isAuthRoute = request.nextUrl.pathname === "/login" || isSecretSignupLink;
  const isDevelopmentPreview = request.nextUrl.pathname.startsWith("/preview/") && process.env.VERCEL_ENV !== "production";
  // Pages ouvertes à tous : la landing et ses annexes, même sans compte.
  const isPublicPage =
    request.nextUrl.pathname === "/" ||
    isDevelopmentPreview ||
    request.nextUrl.pathname === "/apps" ||
    request.nextUrl.pathname.startsWith("/apps/je-suis-par-la-grace-de-dieu/evaluation/") ||
    request.nextUrl.pathname.startsWith("/apps/generopoly") ||
    request.nextUrl.pathname.startsWith("/api/apps/grace-identity/reviews/") ||
    request.nextUrl.pathname.startsWith("/mapp/invitation/") ||
    request.nextUrl.pathname.startsWith("/api/mapp/invitations/") ||
    // Le questionnaire invité est protégé par son cookie HttpOnly et vérifie
    // son secret dans chaque route. Il ne possède volontairement pas de session
    // Supabase Ministry School.
    request.nextUrl.pathname.startsWith("/api/mapp/attempts/") ||
    request.nextUrl.pathname.startsWith("/api/mapp/hybrid-44/attempts/") ||
    request.nextUrl.pathname.startsWith("/api/mapp/hybrid-44/results/") ||
    request.nextUrl.pathname.startsWith("/api/mapp/results/") ||
    request.nextUrl.pathname.startsWith("/apps/profil-mapp/test/") ||
    request.nextUrl.pathname === "/api/deployment-version" ||
    request.nextUrl.pathname === "/mentions-legales" ||
    request.nextUrl.pathname === "/mot-de-passe-oublie" ||
    // Lien d'abonnement au calendrier : personnel et secret, vérifié par la route elle-même.
    request.nextUrl.pathname.startsWith("/agenda/");
  // Les liens reçus par e-mail (confirmation, réinitialisation) arrivent sans session :
  // ils doivent passer pour être échangés.
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/");

  if (!isAuthenticated && !isAuthRoute && !isAuthCallback && !isPublicPage) {
    const url = request.nextUrl.clone();
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/etudiant";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Ne s'exécute pas sur les fichiers statiques : images, polices, scripts et styles
  // servis depuis /public. Sans cela, ils seraient renvoyés vers la page de connexion.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif|otf|woff2?|js|css|html?|txt|xml|json|webmanifest)$).*)"],
};
