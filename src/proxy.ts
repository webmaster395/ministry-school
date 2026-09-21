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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/inscription";
  // Pages ouvertes à tous : la landing et ses annexes, même sans compte.
  const isPublicPage =
    request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/mentions-legales";
  // Le lien de confirmation arrive sans session : il doit passer pour être échangé.
  const isAuthCallback =
    request.nextUrl.pathname.startsWith("/auth/callback") ||
    request.nextUrl.pathname.startsWith("/auth/confirm");

  if (!user && !isAuthRoute && !isAuthCallback && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Ne s'exécute pas sur les fichiers statiques : images, polices, scripts et styles
  // servis depuis /public. Sans cela, ils seraient renvoyés vers la page de connexion.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif|otf|woff2?|js|css|txt|xml|webmanifest)$).*)"],
};
