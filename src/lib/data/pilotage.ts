import { SupabaseClient } from "@supabase/supabase-js";
import { formatSessionDate, formatTimeRange } from "@/lib/format";

export type PilotSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  room: string | null;
  description: string | null;
  track: string | null;
  speaker_name: string | null;
  summary: string | null;
  objectives: string | null;
  bible_refs: string | null;
  teacher: { full_name: string } | null;
};

export type ChecklistItem = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  required: boolean;
};

const lines = (t: string | null | undefined) =>
  (t ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Ministères que pilote la personne (en propre ou par délégation). */
export async function getSteeredMinistries(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return [];
  const { data } = await supabase.from("ministries").select("id, slug, name").in("id", ids);
  return (data ?? []) as { id: string; slug: string; name: string }[];
}

export async function getMinistrySessions(supabase: SupabaseClient, ministryId: string) {
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, description, track, speaker_name, summary, objectives, bible_refs, teacher:profiles!sessions_teacher_id_fkey(full_name)"
    )
    .eq("ministry_id", ministryId)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });
  return (data ?? []) as unknown as PilotSession[];
}

/** Nombre de consignes et de supports déjà en place, par séance. */
export async function getPrepCounts(supabase: SupabaseClient, sessionIds: string[]) {
  const assignments = new Map<string, number>();
  const materials = new Map<string, number>();
  if (!sessionIds.length) return { assignments, materials };

  const [{ data: a }, { data: m }] = await Promise.all([
    supabase.from("assignments").select("session_id").in("session_id", sessionIds),
    supabase.from("materials").select("session_id").in("session_id", sessionIds),
  ]);
  for (const r of a ?? []) assignments.set(r.session_id, (assignments.get(r.session_id) ?? 0) + 1);
  for (const r of m ?? []) materials.set(r.session_id, (materials.get(r.session_id) ?? 0) + 1);
  return { assignments, materials };
}

/**
 * Liste de préparation d'une séance.
 * - pilotage (pasteur et secrétaire) : sept éléments, dont quatre obligatoires
 *   (modalités, enseignant, présentation, objectifs).
 * - enseignant : cinq éléments, dont deux obligatoires (présentation, objectifs).
 */
export function checklistOf(
  s: PilotSession,
  nAssignments: number,
  nMaterials: number,
  kind: "pilotage" | "enseignant" = "pilotage"
): ChecklistItem[] {
  const teacher = s.teacher?.full_name ?? s.speaker_name;
  const objectives = lines(s.objectives).length;
  const refs = lines(s.bible_refs).length;
  const summaryLength = (s.summary ?? "").trim().length;

  const modalites: ChecklistItem = {
    key: "modalites",
    label: "Modalités pratiques",
    detail: `${formatSessionDate(s.session_date).toLowerCase()} · ${formatTimeRange(s.start_time, s.end_time)} · ${s.location}${s.room ? ` · ${s.room}` : ""}`,
    done: !!(s.session_date && s.start_time && s.end_time && s.location),
    required: true,
  };
  const enseignant: ChecklistItem = {
    key: "enseignant",
    label: "Enseignant",
    detail: teacher ?? "À renseigner",
    done: !!teacher,
    required: true,
  };
  const presentation: ChecklistItem = {
    key: "presentation",
    label: "Présentation",
    detail: summaryLength
      ? plural(summaryLength, "caractère ajouté", "caractères ajoutés")
      : kind === "enseignant"
        ? "Expliquez en quelques lignes le sujet du cours."
        : "À rédiger",
    done: summaryLength > 0,
    required: true,
  };
  const objectifs: ChecklistItem = {
    key: "objectifs",
    label: "Objectifs",
    detail: objectives
      ? plural(objectives, "objectif ajouté", "objectifs ajoutés")
      : kind === "enseignant"
        ? "Précisez ce que les étudiants comprendront ou sauront mettre en pratique."
        : "À rédiger",
    done: objectives > 0,
    required: true,
  };
  const consignes: ChecklistItem = {
    key: "consignes",
    label: "À préparer avant le cours",
    detail: nAssignments ? plural(nAssignments, "élément à préparer", "éléments à préparer") : "Aucune consigne",
    done: nAssignments > 0,
    required: false,
  };
  const supports: ChecklistItem = {
    key: "supports",
    label: "Supports du cours",
    detail: nMaterials ? plural(nMaterials, "support ajouté", "supports ajoutés") : "Aucun support obligatoire",
    done: nMaterials > 0,
    required: false,
  };
  const references: ChecklistItem = {
    key: "references",
    label: "Références bibliques",
    detail: refs ? plural(refs, "référence", "références") : "Aucune référence",
    done: refs > 0,
    required: false,
  };

  return kind === "enseignant"
    ? [presentation, objectifs, consignes, supports, references]
    : [modalites, enseignant, presentation, objectifs, consignes, supports, references];
}

export function progressOf(items: ChecklistItem[]) {
  const required = items.filter((i) => i.required);
  const requiredDone = required.filter((i) => i.done).length;
  return {
    completed: items.filter((i) => i.done).length,
    total: items.length,
    requiredDone,
    requiredTotal: required.length,
    ready: requiredDone === required.length,
  };
}

/** Les séances confiées à cet enseignant (par son compte). */
/** Les séances d'un enseignant ; sans identifiant, celles de tous (vue de l'administrateur). */
export async function getTeacherPrepSessions(supabase: SupabaseClient, teacherId: string | null) {
  let query = supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, description, track, speaker_name, summary, objectives, bible_refs, teacher:profiles!sessions_teacher_id_fkey(full_name)"
    )
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (teacherId) query = query.eq("teacher_id", teacherId);
  const { data } = await query;
  return (data ?? []) as unknown as PilotSession[];
}

export async function buildRows(
  supabase: SupabaseClient,
  sessions: PilotSession[],
  kind: "pilotage" | "enseignant"
) {
  const counts = await getPrepCounts(
    supabase,
    sessions.map((s) => s.id)
  );
  const { data: heads } = await supabase.rpc("session_headcounts", { p_ids: sessions.map((s) => s.id) });
  const students = new Map<string, number>(
    ((heads ?? []) as { session_id: string; students: number }[]).map((h) => [h.session_id, Number(h.students)])
  );
  return sessions.map((s) => {
    const items = checklistOf(s, counts.assignments.get(s.id) ?? 0, counts.materials.get(s.id) ?? 0, kind);
    return { s, items, progress: progressOf(items), students: students.get(s.id) ?? null };
  });
}
