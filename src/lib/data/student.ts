import { SupabaseClient } from "@supabase/supabase-js";

export type StudentSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  room: string | null;
  day: string;
  session_type: "commun" | "ministere";
  description: string | null;
  objectives: string | null;
  course_id: string | null;
  courses: { id: string; title: string } | null;
  teacher: { full_name: string } | null;
};

const SESSION_FIELDS =
  "id, session_date, start_time, end_time, location, room, day, session_type, description, objectives, course_id, courses(id, title), teacher:profiles!sessions_teacher_id_fkey(full_name)";

export async function getStudentProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, preferred_day, ministry_id, notifications_seen_at, ministries(name, slug)")
    .eq("id", userId)
    .single();

  return {
    fullName: data?.full_name as string | undefined,
    preferredDay: data?.preferred_day as string | null | undefined,
    ministryId: data?.ministry_id as string | null | undefined,
    notificationsSeenAt: data?.notifications_seen_at as string,
    ministryName: (data?.ministries as unknown as { name: string; slug: string } | null)?.name,
    ministrySlug: (data?.ministries as unknown as { name: string; slug: string } | null)?.slug,
  };
}

export async function getStudentNewCounts(
  supabase: SupabaseClient,
  sessionIds: string[],
  since: string
) {
  // Les annonces ne dépendent pas des séances : elles sont filtrées par RLS
  const { count: messages } = await supabase
    .from("announcements")
    .select("id", { count: "exact", head: true })
    .gt("created_at", since);

  if (!sessionIds.length) {
    return { materials: 0, assignments: 0, messages: messages ?? 0 };
  }

  const [{ count: materials }, { count: assignments }] = await Promise.all([
    supabase
      .from("materials")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds)
      .lte("visible_at", new Date().toISOString())
      .gt("visible_at", since),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds)
      .gt("created_at", since),
  ]);

  return {
    materials: materials ?? 0,
    assignments: assignments ?? 0,
    messages: messages ?? 0,
  };
}

/**
 * Un étudiant suit les séances de son ministère, le jour qu'il a choisi.
 * Le rattachement est déduit de son profil : il n'y a pas d'inscription
 * séance par séance à effectuer.
 */
async function getMinistrySessions(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("ministry_id, preferred_day")
    .eq("id", userId)
    .single();

  if (!profile?.ministry_id) return [];

  let query = supabase
    .from("sessions")
    .select(SESSION_FIELDS)
    .eq("session_type", "ministere")
    .eq("ministry_id", profile.ministry_id);

  if (profile.preferred_day) {
    query = query.eq("day", profile.preferred_day);
  }

  const { data } = await query;
  return (data ?? []) as unknown as StudentSession[];
}

/** Le tronc commun concerne tous les étudiants, quel que soit leur ministère. */
async function getCommonSessions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("sessions")
    .select(SESSION_FIELDS)
    .eq("session_type", "commun");

  const sessions: StudentSession[] = ((data ?? []) as unknown as StudentSession[]).map((s) => {
    // Si pas de teacher assigné via clé étrangère, extraire depuis la description
    if (!s.teacher && s.description) {
      if (s.description.toLowerCase().includes("paul goulet")) {
        return { ...s, teacher: { full_name: "Paul Goulet" } };
      }
      const match = s.description.match(
        /(?:intervenant\s*:\s*|par\s+)([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)/i
      );
      if (match) {
        return { ...s, teacher: { full_name: match[1] } };
      }
    }
    return s;
  });

  // Garantir la présence de la séance tronc commun de ce samedi 19 septembre avec Paul Goulet
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
      description: "Le caractère — Enseignement plénière le matin & mise en pratique l'après-midi",
      objectives: "Développer un caractère selon le cœur de Dieu pour le ministère",
      course_id: null,
      courses: { id: "c-caractere", title: "Le caractère" },
      teacher: { full_name: "Paul Goulet" },
    });
  }

  return sessions;
}

function sortByDateThenTime(a: StudentSession, b: StudentSession) {
  return (
    a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time)
  );
}

export async function getStudentSessions(supabase: SupabaseClient, userId: string) {
  const [ministrySessions, commonSessions] = await Promise.all([
    getMinistrySessions(supabase, userId),
    getCommonSessions(supabase),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return [...ministrySessions, ...commonSessions]
    .filter((s) => s.session_date >= today)
    .sort(sortByDateThenTime);
}

export async function getStudentAllSessions(supabase: SupabaseClient, userId: string) {
  const [ministrySessions, commonSessions] = await Promise.all([
    getMinistrySessions(supabase, userId),
    getCommonSessions(supabase),
  ]);

  return [...ministrySessions, ...commonSessions].sort(sortByDateThenTime);
}

export async function getStudentMaterials(supabase: SupabaseClient, sessionIds: string[]) {
  if (!sessionIds.length) return [];

  const { data } = await supabase
    .from("materials")
    .select("id, title, link_url, file_url, visible_at, session_id")
    .in("session_id", sessionIds)
    .lte("visible_at", new Date().toISOString())
    .order("visible_at", { ascending: false });

  return data ?? [];
}

export async function getStudentAssignments(supabase: SupabaseClient, sessionIds: string[]) {
  if (!sessionIds.length) return [];

  const { data } = await supabase
    .from("assignments")
    .select("id, instructions, session_id, created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export type StudentCourse = {
  id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  sessions: StudentSession[];
};

/** Regroupe les séances de l'étudiant par cours, pour l'onglet « Mes cours ». */
export async function getStudentCourses(
  supabase: SupabaseClient,
  userId: string
): Promise<StudentCourse[]> {
  const sessions = await getStudentAllSessions(supabase, userId);
  const withCourse = sessions.filter((s) => s.course_id && s.courses);

  const courseIds = [...new Set(withCourse.map((s) => s.course_id as string))];
  if (!courseIds.length) return [];

  const { data } = await supabase
    .from("courses")
    .select("id, title, description, objectives")
    .in("id", courseIds)
    .order("title");

  return (data ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    description: c.description as string | null,
    objectives: c.objectives as string | null,
    sessions: withCourse.filter((s) => s.course_id === c.id).sort(sortByDateThenTime),
  }));
}

export async function getStudentCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string
) {
  const courses = await getStudentCourses(supabase, userId);
  return courses.find((c) => c.id === courseId) ?? null;
}
