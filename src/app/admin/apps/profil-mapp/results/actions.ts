"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { createServiceClient } from "@/lib/supabase/service";

const CONFIRMATION = "SUPPRIMER";

export async function archiveAllMappResults(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) throw new Error("Accès refusé.");
  if (String(formData.get("confirmation") ?? "").trim() !== CONFIRMATION) {
    throw new Error(`Saisissez ${CONFIRMATION} pour confirmer.`);
  }

  const db = createServiceClient().schema("mapp");
  const ids: string[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db
      .from("attempts")
      .select("id")
      .is("deleted_at", null)
      .order("started_at", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Chargement des résultats impossible : ${error.message}`);
    const page = (data ?? []) as Array<{ id: string }>;
    ids.push(...page.map((item) => item.id));
    if (page.length < pageSize) break;
  }

  let archived = 0;
  for (let index = 0; index < ids.length; index += 500) {
    const { data, error } = await db.rpc("admin_archive_attempts", {
      target_ids: ids.slice(index, index + 500),
      actor: viewer.id,
    });
    if (error) throw new Error(`Suppression des résultats impossible : ${error.message}`);
    archived += Number(data ?? 0);
  }

  revalidatePath("/admin/apps/profil-mapp/results");
  redirect(`/admin/apps/profil-mapp/results?deleted=${archived}`);
}
