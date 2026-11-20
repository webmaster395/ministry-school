import { getViewer } from "@/lib/data/viewer";
import { getMembers } from "@/lib/data/admin-hub";
import { createClient } from "@/lib/supabase/server";
import { RESOURCE_TYPES, type ResourceAccessType } from "@/lib/resource-access";

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) return Response.json({ error: "Accès refusé." }, { status: 403 });

  const url = new URL(request.url);
  const resourceType = url.searchParams.get("type") as ResourceAccessType | null;
  const resourceId = url.searchParams.get("id");
  if (!resourceType || !RESOURCE_TYPES.includes(resourceType)) return Response.json({ error: "Type de ressource invalide." }, { status: 400 });

  const supabase = await createClient();
  const [{ data: lists, error: listsError }, { data: memberships }, members] = await Promise.all([
    supabase.from("user_lists").select("id,name,description,category").order("name"),
    supabase.from("user_list_members").select("list_id"),
    getMembers(supabase),
  ]);
  if (listsError) return Response.json({ error: listsError.message }, { status: 500 });

  let configured = false;
  let mode = "all_authenticated";
  let selectedListIds: string[] = [];
  let selectedCategories: string[] = [];
  let selectedUserIds: string[] = [];
  if (resourceId) {
    const [{ data: control }, { data: listLinks }, { data: categoryLinks }, { data: userLinks }] = await Promise.all([
      supabase.from("resource_access_controls").select("visibility_mode").eq("resource_type", resourceType).eq("resource_id", resourceId).maybeSingle(),
      supabase.from("resource_access_lists").select("list_id").eq("resource_type", resourceType).eq("resource_id", resourceId),
      supabase.from("resource_access_categories").select("category").eq("resource_type", resourceType).eq("resource_id", resourceId),
      supabase.from("resource_access_users").select("user_id").eq("resource_type", resourceType).eq("resource_id", resourceId),
    ]);
    configured = Boolean(control);
    mode = control?.visibility_mode ?? mode;
    selectedListIds = (listLinks ?? []).map((item) => item.list_id);
    selectedCategories = (categoryLinks ?? []).map((item) => item.category);
    selectedUserIds = (userLinks ?? []).map((item) => item.user_id);
  }

  const memberCounts = new Map<string, number>();
  for (const membership of memberships ?? []) memberCounts.set(membership.list_id, (memberCounts.get(membership.list_id) ?? 0) + 1);

  return Response.json({
    configured,
    mode,
    selectedListIds,
    selectedCategories,
    selectedUserIds,
    lists: (lists ?? []).map((list) => ({ ...list, memberCount: memberCounts.get(list.id) ?? 0 })),
    users: members.filter((member) => !member.deactivated).map((member) => ({ id: member.id, name: member.full_name, email: member.email })),
  });
}

