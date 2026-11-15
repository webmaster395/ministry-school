import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { invitationHash, invitationUrl, newInvitationToken } from "@/lib/mapp/invitations";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer || viewer.deactivated) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const db = await createClient();
  const { data, error } = await db.rpc("mapp_list_personal_invitations");
  if (error) return Response.json({ error: "Invitations indisponibles." }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.deactivated) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const token = newInvitationToken();
  const db = await createClient();
  const { data, error } = await db.rpc("mapp_create_personal_invitation", { p_token_hash: invitationHash(token) });
  if (error) {
    const limited = error.message.includes("MAPP_INVITATION_LIMIT");
    return Response.json({ error: limited ? "Les trois invitations ont déjà été utilisées." : "L’invitation n’a pas pu être créée." }, { status: limited ? 409 : 500 });
  }
  return Response.json({ ...data, url: invitationUrl(token, new URL(request.url).origin) });
}
