import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  fullName: string;
  role: "student" | "teacher" | "admin";
  ministrySlug: string | null;
  ministryName: string | null;
};

/**
 * L'utilisateur connecté et son ministère. Mise en cache le temps d'une requête :
 * la barre latérale et l'en-tête l'utilisent toutes deux sans doubler l'appel.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("full_name, role, ministries(slug, name)")
    .eq("id", user.id)
    .single();

  const ministry = data?.ministries as unknown as { slug: string; name: string } | null;

  return {
    id: user.id,
    fullName: (data?.full_name as string | undefined) ?? "",
    role: (data?.role as Viewer["role"] | undefined) ?? "student",
    ministrySlug: ministry?.slug ?? null,
    ministryName: ministry?.name ?? null,
  };
});
