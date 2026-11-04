import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { naturalSkillCategories } from "@/lib/apps/grace-identity";

const knownSkills = new Set<string>(naturalSkillCategories.flatMap((category) => category.skills));
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.deactivated) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = await request.json().catch(() => null) as { skills?: unknown } | null;
  const skills = Array.isArray(body?.skills) ? [...new Set(body.skills.filter((skill): skill is string => typeof skill === "string" && knownSkills.has(skill)))].slice(0, 80) : [];
  if (!skills.length) return NextResponse.json({ error: "Sélectionnez au moins une compétence." }, { status: 400 });
  const token = randomBytes(32).toString("base64url");
  const supabase = await createClient();
  // La table n’est accessible qu’au propriétaire via une fonction serveur ; la
  // création est effectuée par une RPC future si le rôle service est absent.
  const { error } = await supabase.from("grace_identity_skill_reviews").insert({
    owner_user_id: viewer.id, token_hash: digest(token), selected_skills: skills,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) return NextResponse.json({ error: "Le lien n’a pas pu être créé." }, { status: 500 });
  return NextResponse.json({ url: `/apps/je-suis-par-la-grace-de-dieu/evaluation/${token}` });
}
