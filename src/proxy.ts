import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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
  const isProfilMappRoute = request.nextUrl.pathname.startsWith("/apps/profil-mapp");

  // Profil MAPP est en préouverture. Le masquer dans le catalogue ne suffit
  // pas : cette vérification protège aussi les URL copiées et les routes API
  // servies sous le même préfixe. Le droit vient de la base Ministry, jamais
  // d'un rôle simplement affiché dans l'interface.
  if (isProfilMappRoute) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const { data: viewer, error: viewerError } = await supabase.rpc("student_viewer_context");
    const isSuperAdmin = !viewerError && Boolean((viewer as { super_admin?: boolean } | null)?.super_admin);
    if (!isSuperAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/etudiant";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

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
  // Pages ouvertes à tous : la landing et ses annexes, même sans compte.
  const isPublicPage =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname === "/apps" ||
    request.nextUrl.pathname.startsWith("/apps/je-suis-par-la-grace-de-dieu/evaluation/") ||
    request.nextUrl.pathname.startsWith("/apps/generopoly") ||
    isProfilMappRoute ||
    request.nextUrl.pathname.startsWith("/api/apps/grace-identity/reviews/") ||
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
    url.pathname = "/login";
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
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif|otf|woff2?|js|css|txt|xml|json|webmanifest)$).*)"],
};
