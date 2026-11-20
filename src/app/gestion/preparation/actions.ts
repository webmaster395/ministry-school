"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import {
  normalizeTrainingProgram,
  sortSlots,
  type ProgramDraft,
  type ProgramSlot,
  type TrainingProgram,
} from "@/lib/preparation/program";

async function requireSuperAdmin() {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) throw new Error("Accès réservé aux super administrateurs.");
  return viewer;
}

const shortTime = (value: string | null | undefined) => value?.slice(0, 5) ?? "";

export async function importTrainingDay(date: string): Promise<{ slots: ProgramSlot[]; found: number }> {
  await requireSuperAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date invalide.");
  const supabase = await createClient();
  const [sessionsResult, opportunitiesResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, start_time, end_time, location, room, description, track, speaker_name, summary, objectives, courses(title), services(name), teacher:profiles!sessions_teacher_id_fkey(full_name)")
      .eq("session_date", date)
      .or("is_draft.eq.false,is_draft.is.null")
      .order("start_time"),
    supabase
      .from("opportunity_dates")
      .select("opportunity_id, start_time, end_time, location, room, opportunity:opportunities(title, description, speakers, kind, organizer_label)")
      .eq("session_date", date)
      .order("start_time"),
  ]);

  if (sessionsResult.error) throw new Error(`Import des cours impossible : ${sessionsResult.error.message}`);
  if (opportunitiesResult.error) throw new Error(`Import des formations impossible : ${opportunitiesResult.error.message}`);

  type SessionRow = {
    id: string; start_time: string; end_time: string; location: string | null; room: string | null;
    description: string | null; track: string | null; speaker_name: string | null; summary: string | null;
    objectives: string | null; courses: { title: string } | null; services: { name: string } | null;
    teacher: { full_name: string } | null;
  };
  const sessions = (sessionsResult.data ?? []) as unknown as SessionRow[];
  const sessionIds = sessions.map((session) => session.id);
  const { data: trainerLinks, error: trainerError } = sessionIds.length
    ? await supabase.from("session_trainers").select("session_id, position, trainer:trainers(first_name, last_name)").in("session_id", sessionIds).order("position")
    : { data: [], error: null };
  if (trainerError) throw new Error(`Import des intervenants impossible : ${trainerError.message}`);
  const trainers = new Map<string, string[]>();
  for (const link of trainerLinks ?? []) {
    const trainer = link.trainer as unknown as { first_name: string; last_name: string } | null;
    if (!trainer) continue;
    const current = trainers.get(link.session_id) ?? [];
    current.push(`${trainer.first_name} ${trainer.last_name}`.trim());
    trainers.set(link.session_id, current);
  }

  const courseSlots: ProgramSlot[] = sessions.map((session) => ({
    id: crypto.randomUUID(),
    sourceId: `session:${session.id}`,
    start: shortTime(session.start_time),
    end: shortTime(session.end_time),
    type: "formation",
    title: session.courses?.title ?? session.description ?? "Formation",
    subtitle: "",
    speaker: "",
    description: [session.track, session.services?.name, trainers.get(session.id)?.join(" · ") || session.speaker_name || session.teacher?.full_name, session.summary || session.objectives].filter(Boolean).join(" · ").slice(0, 220),
    location: [session.location, session.room].filter(Boolean).join(" · "),
  }));

  type OpportunityRow = {
    opportunity_id: string; start_time: string; end_time: string; location: string | null; room: string | null;
    opportunity: { title: string; description: string | null; speakers: string | null; kind: string | null; organizer_label: string | null } | null;
  };
  const opportunitySlots: ProgramSlot[] = ((opportunitiesResult.data ?? []) as unknown as OpportunityRow[]).map((row) => ({
    id: crypto.randomUUID(),
    sourceId: `opportunity:${row.opportunity_id}:${date}`,
    start: shortTime(row.start_time),
    end: shortTime(row.end_time),
    type: row.opportunity?.kind === "formation" ? "formation" : "atelier",
    title: row.opportunity?.title || "Formation",
    subtitle: "",
    speaker: "",
    description: [row.opportunity?.organizer_label, row.opportunity?.speakers, row.opportunity?.description].filter(Boolean).join(" · ").slice(0, 220),
    location: [row.location, row.room].filter(Boolean).join(" · "),
  }));

  const slots = sortSlots([...courseSlots, ...opportunitySlots]);
  return { slots, found: slots.length };
}

export async function saveProgramDraft(input: { id?: string | null; program: TrainingProgram }): Promise<ProgramDraft> {
  const viewer = await requireSuperAdmin();
  const program = normalizeTrainingProgram(input.program);
  const supabase = await createClient();
  const values = {
    title: program.title,
    program_date: program.baseDate,
    day_mode: program.dayMode,
    payload: program,
  };
  const query = input.id
    ? supabase.from("training_program_drafts").update(values).eq("id", input.id)
    : supabase.from("training_program_drafts").insert({ ...values, created_by: viewer.id });
  const { data, error } = await query.select("id, title, program_date, day_mode, payload, created_by, created_at, updated_at").single();
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  revalidatePath("/gestion/preparation");
  return data as unknown as ProgramDraft;
}

export async function duplicateProgramDraft(id: string): Promise<ProgramDraft> {
  const viewer = await requireSuperAdmin();
  const supabase = await createClient();
  const { data: source, error: readError } = await supabase
    .from("training_program_drafts")
    .select("title, program_date, day_mode, payload")
    .eq("id", id)
    .single();
  if (readError || !source) throw new Error("Brouillon introuvable.");
  const program = normalizeTrainingProgram(source.payload);
  program.title = `${program.title} — copie`;
  const { data, error } = await supabase.from("training_program_drafts").insert({
    title: program.title,
    program_date: program.baseDate,
    day_mode: program.dayMode,
    payload: program,
    created_by: viewer.id,
  }).select("id, title, program_date, day_mode, payload, created_by, created_at, updated_at").single();
  if (error) throw new Error(`Duplication impossible : ${error.message}`);
  revalidatePath("/gestion/preparation");
  return data as unknown as ProgramDraft;
}

export async function deleteProgramDraft(id: string) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("training_program_drafts").delete().eq("id", id);
  if (error) throw new Error(`Suppression impossible : ${error.message}`);
  revalidatePath("/gestion/preparation");
  return { success: true };
}
