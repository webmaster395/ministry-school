import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Point d'arrivée du lien de confirmation envoyé par e-mail.
// Supabase renvoie un code à échanger contre une session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Page où aller ensuite ; seulement une adresse de ce site, jamais un autre domaine
  const nextParam = searchParams.get("next") ?? "";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?erreur=lien_invalide`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // La session est ouverte : /app oriente selon le rôle (l'accueil « / » est la landing)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erreur=lien_invalide`);
}
