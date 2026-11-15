import { getViewer } from "@/lib/data/viewer";
import { createServiceClient } from "@/lib/supabase/service";
import { invitationHash, invitationUrl, newInvitationToken } from "@/lib/mapp/invitations";

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) return Response.json({ error: "Accès refusé." }, { status: 403 });
  const token = newInvitationToken();
  const { data, error } = await createServiceClient().schema("mapp").from("invitations")
    .insert({ inviter_user_id: viewer.id, invitation_kind: "admin", token_hash: invitationHash(token) })
    .select("id,created_at").single();
  if (error) return Response.json({ error: "Le lien administrateur n’a pas pu être créé." }, { status: 500 });
  return Response.json({ ...data, url: invitationUrl(token, new URL(request.url).origin) });
}
