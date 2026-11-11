"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

const value = (form: FormData, key: string, max = 20000) => String(form.get(key) ?? "").trim().slice(0, max);
const lines = (form: FormData, key: string) => value(form, key).split(/\n+/).map((item) => item.trim()).filter(Boolean);

export async function saveHeroesResult(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) throw new Error("Accès refusé.");
  const id = value(formData, "id", 100); const userId = value(formData, "userId", 100) || null;
  const communication = value(formData, "communication", 20);
  if (!['authorized', 'refused'].includes(communication)) throw new Error("Statut de communication invalide.");
  const portrait = value(formData, "portrait"); const motors = lines(formData, "motors"); const heroes = lines(formData, "heroes").slice(0, 3);
  if (communication === "authorized" && (!portrait || !motors.length || heroes.length < 2)) throw new Error("Le portrait, les moteurs et au moins deux héros sont requis.");
  const visible = formData.get("visible") === "on";
  const supabase = await createClient();
  const { data: current, error: currentError } = id ? await supabase.from("heroes_motors_results").select("*").eq("id", id).single() : { data: null, error: null };
  if (currentError) throw new Error(`Résultat introuvable : ${currentError.message}`);
  if (current?.user_id && current.user_id !== userId && formData.get("confirmReassignment") !== "on") throw new Error("Confirmez le changement d’attribution.");
  const { data: accounts, error: accountError } = await supabase.rpc("heroes_motors_admin_accounts");
  if (accountError) throw new Error(accountError.message);
  const account = (accounts ?? []).find((item: { user_id: string }) => item.user_id === userId);
  const payload = {
    user_id: userId, source_email: account?.email ?? current?.source_email ?? null,
    first_name: value(formData, "firstName", 120) || account?.full_name?.split(/\s+/)[0] || current?.first_name || "",
    portrait: portrait || null, motors, heroes, communication_status: communication,
    visible, assignment_status: userId ? "assigned" : "unassigned", anomalies: [],
    validation_status: "validated", publication_status: visible ? "published" : "draft",
    published_at: visible ? (current?.published_at ?? new Date().toISOString()) : null,
    last_modified_by: viewer.id,
  };
  const mutation = id ? supabase.from("heroes_motors_results").update(payload).eq("id", id) : supabase.from("heroes_motors_results").insert({ ...payload, source_response_id: `manual-${crypto.randomUUID()}`, source_payload: {} });
  const { data: saved, error } = await mutation.select("id").single();
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  const changed = current ? Object.keys(payload).filter((key) => JSON.stringify(current[key]) !== JSON.stringify(payload[key as keyof typeof payload])) : Object.keys(payload);
  const { error: auditError } = await supabase.from("heroes_motors_result_audit").insert({ result_id: saved.id, actor_id: viewer.id, action: current ? (current.user_id !== userId ? "assignment" : "update") : "insert", changed_fields: changed, previous_value: current, next_value: payload });
  if (auditError) throw new Error(`Résultat enregistré mais journalisation impossible : ${auditError.message}`);
  revalidatePath("/admin/apps/test-des-heros/results"); revalidatePath("/etudiant/identite"); revalidatePath("/etudiant/identite/mes-moteurs");
  redirect("/admin/apps/test-des-heros/results?saved=1");
}
