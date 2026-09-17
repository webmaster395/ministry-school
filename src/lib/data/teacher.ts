import { SupabaseClient } from "@supabase/supabase-js";

export type TeacherSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  room: string | null;
  day: string;
  session_type: "commun" | "ministere";
  description: string | null;
  ministries: { name: string } | null;
};

export async function getTeacherSessions(supabase: SupabaseClient, teacherId: string) {
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, day, session_type, description, ministries(name)"
    )
    .eq("teacher_id", teacherId)
    .order("session_date", { ascending: true });

  return (data ?? []) as unknown as TeacherSession[];
}

export async function getCommonSessions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, start_time, end_time, location, room, day, session_type, description")
    .eq("session_type", "commun")
    .order("session_date", { ascending: true });

  const sessions: TeacherSession[] = (data ?? []).map((s) => ({ ...s, ministries: null })) as unknown as TeacherSession[];

  const hasSaturday19 = sessions.some((s) => s.session_date === "2026-09-19");
  if (!hasSaturday19) {
    sessions.push({
      id: "session-tronc-commun-19-sep",
      session_date: "2026-09-19",
      start_time: "09:30:00",
      end_time: "17:00:00",
      location: "MLK 2 (MLK Studio)",
      room: null,
      day: "samedi",
      session_type: "commun",
      description: "Paul Goulet — Le caractère (Tronc commun)",
      ministries: null,
    });
  }

  return sessions;
}

export async function getEnrollmentCounts(supabase: SupabaseClient, sessions: TeacherSession[]) {
  const counts = new Map<string, number>();

  for (const s of sessions) {
    const { count } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("session_id", s.id);
    counts.set(s.id, count ?? 0);
  }

  return counts;
}

export async function getTeacherMaterials(supabase: SupabaseClient, sessionIds: string[]) {
  if (!sessionIds.length) return [];

  const { data } = await supabase
    .from("materials")
    .select("id, title, link_url, visible_at, session_id")
    .in("session_id", sessionIds)
    .order("visible_at", { ascending: false });

  return data ?? [];
}

export async function getTeacherAssignments(supabase: SupabaseClient, sessionIds: string[]) {
  if (!sessionIds.length) return [];

  const { data } = await supabase
    .from("assignments")
    .select("id, instructions, session_id, created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export type EnrolledStudent = {
  id: string;
  full_name: string;
  session_id: string;
};

export async function getTeacherStudents(supabase: SupabaseClient, sessionIds: string[]) {
  if (!sessionIds.length) return [];

  const { data } = await supabase
    .from("enrollments")
    .select("session_id, student:profiles!enrollments_student_id_fkey(id, full_name)")
    .in("session_id", sessionIds);

  return (data ?? []).map((row) => ({
    session_id: row.session_id as string,
    ...(row.student as unknown as { id: string; full_name: string }),
  })) as EnrolledStudent[];
}
