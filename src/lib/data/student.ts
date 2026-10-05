import { SupabaseClient } from "@supabase/supabase-js";
import { DRAFTS_ENABLED } from "@/lib/drafts";

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
  speaker_name?: string | null;
  track?: string | null;
  summary?: string | null;
  bible_refs?: string | null;
  video_url?: string | null;
  cover_image_path?: string | null;
  show_parking_notice?: boolean;
};

const SESSION_FIELDS =
  "id, session_date, start_time, end_time, location, room, day, session_type, description, objectives, speaker_name, track, summary, bible_refs, show_parking_notice, course_id, courses(id, title), teacher:profiles!sessions_teacher_id_fkey(full_name)";

export async function getStudentProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select(
      "full_name, preferred_day, ministry_id, notifications_seen_at, ministries!profiles_ministry_id_fkey(name, slug)",
    )
    .eq("id", userId)
    .single();

  return {
    fullName: data?.full_name as string | undefined,
    preferredDay: data?.preferred_day as string | null | undefined,
    ministryId: data?.ministry_id as string | null | undefined,
    notificationsSeenAt: data?.notifications_seen_at as string,
    ministryName: (
      data?.ministries as unknown as { name: string; slug: string } | null
    )?.name,
    ministrySlug: (
      data?.ministries as unknown as { name: string; slug: string } | null
    )?.slug,
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
  if (DRAFTS_ENABLED) query = query.eq("is_draft", false);

  if (profile.preferred_day) {
    query = query.eq("day", profile.preferred_day);
  }

  const { data } = await query;
  return (data ?? []) as unknown as StudentSession[];
}

/** Le tronc commun concerne tous les étudiants, quel que soit leur ministère. */
async function getCommonSessions(supabase: SupabaseClient) {
  let common = supabase
    .from("sessions")
    .select(SESSION_FIELDS)
    .eq("session_type", "commun");
  if (DRAFTS_ENABLED) common = common.eq("is_draft", false);
  const { data } = await common;

  const sessions: StudentSession[] = (
    (data ?? []) as unknown as StudentSession[]
  ).map((s) => {
    // Le nom saisi sur la séance prime : il désigne la personne qui donne réellement le cours
    if (s.speaker_name) {
      return { ...s, teacher: { full_name: s.speaker_name } };
    }
    // Sinon, extraire depuis la description
    if (!s.teacher && s.description) {
      const match = s.description.match(
        /(?:intervenant\s*:\s*|par\s+)([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)/i,
      );
      if (match) {
        return { ...s, teacher: { full_name: match[1] } };
      }
    }
    return s;
  });

  return sessions;
}

function sortByDateThenTime(a: StudentSession, b: StudentSession) {
  return (
    a.session_date.localeCompare(b.session_date) ||
    a.start_time.localeCompare(b.start_time)
  );
}

/**
 * Présentation commune des après-midi du premier trimestre de la promotion.
 * La normalisation est faite ici pour garder l'Accueil, le Calendrier, Mes cours,
 * À faire et les fiches de séance parfaitement cohérents.
 */
function normalizeAutumnPracticeSession(
  session: StudentSession,
): StudentSession {
  const isAutumnAfternoon =
    session.session_date >= "2026-10-01" &&
    session.session_date <= "2026-12-31" &&
    session.start_time.slice(0, 5) >= "14:00" &&
    session.end_time.slice(0, 5) === "17:00";

  if (!isAutumnAfternoon) return session;

  const normalized = {
    ...session,
    start_time: "14:30:00",
    track: "MISE EN PRATIQUE",
  };
  if (session.session_date !== "2026-10-03") return normalized;

  return {
    ...normalized,
    description: "De la formation à l’action",
    speaker_name: "Nathalie Boudehent",
    courses: session.courses
      ? { ...session.courses, title: "De la formation à l’action" }
      : session.courses,
    teacher: { full_name: "Nathalie Boudehent" },
  };
}

function normalizeStudentSessions(sessions: StudentSession[]) {
  return sessions.map(normalizeAutumnPracticeSession).sort(sortByDateThenTime);
}

export async function getStudentSessions(
  supabase: SupabaseClient,
  userId: string,
) {
  const [ministrySessions, commonSessions] = await Promise.all([
    getMinistrySessions(supabase, userId),
    getCommonSessions(supabase),
  ]);

  // Le calendrier est aussi l'archive pédagogique de l'étudiant : une séance accessible
  // ne disparaît jamais après sa date. Les règles de ministère/jour restent inchangées.
  return normalizeStudentSessions([...ministrySessions, ...commonSessions]);
}

export async function getStudentAllSessions(
  supabase: SupabaseClient,
  userId: string,
) {
  const [ministrySessions, commonSessions] = await Promise.all([
    getMinistrySessions(supabase, userId),
    getCommonSessions(supabase),
  ]);

  return normalizeStudentSessions([...ministrySessions, ...commonSessions]);
}

/**
 * Prochaine séance réellement accessible qui correspond au parcours de la séance source.
 * Le cours exact prime, puis la catégorie, puis la prochaine journée du même type.
 */
export function getNextRelevantSession(
  origin: StudentSession,
  sessions: StudentSession[],
) {
  const future = sessions.filter(
    (session) => session.session_date > origin.session_date,
  );
  if (!future.length) return null;
  if (origin.course_id) {
    const sameCourse = future.find(
      (session) => session.course_id === origin.course_id,
    );
    if (sameCourse) return sameCourse;
  }
  const track = origin.track?.trim().toLocaleLowerCase("fr-FR");
  if (track) {
    const sameTrack = future.find(
      (session) => session.track?.trim().toLocaleLowerCase("fr-FR") === track,
    );
    if (sameTrack) return sameTrack;
  }
  return (
    future.find((session) => session.session_type === origin.session_type) ??
    null
  );
}

export async function getStudentMaterials(
  supabase: SupabaseClient,
  sessionIds: string[],
) {
  if (!sessionIds.length) return [];

  const enriched = await supabase
    .from("materials")
    .select(
      "id, title, description, resource_type, link_url, file_url, visible_at, session_id, sort_order",
    )
    .in("session_id", sessionIds)
    .lte("visible_at", new Date().toISOString())
    .order("sort_order")
    .order("visible_at", { ascending: false });

  if (!enriched.error) return enriched.data ?? [];

  // Compatibilité pendant le déploiement : les supports existants restent visibles même si
  // la migration pédagogique enrichie n'est pas encore appliquée à la base.
  const legacy = await supabase
    .from("materials")
    .select("id, title, link_url, file_url, visible_at, session_id")
    .in("session_id", sessionIds)
    .lte("visible_at", new Date().toISOString())
    .order("visible_at", { ascending: false });

  return legacy.data ?? [];
}

export type StudentAssignment = {
  id: string;
  title: string | null;
  description: string | null;
  instructions: string;
  content_type: string | null;
  resource_url: string | null;
  file_url: string | null;
  phase: string | null;
  sort_order: number | null;
  session_id: string;
  created_at: string;
  kind: string | null;
  duration_min: number | null;
  due_at: string | null;
};

export async function getStudentAssignments(
  supabase: SupabaseClient,
  sessionIds: string[],
): Promise<StudentAssignment[]> {
  if (!sessionIds.length) return [];

  const enriched = await supabase
    .from("assignments")
    .select(
      "id, title, description, instructions, content_type, resource_url, file_url, phase, sort_order, session_id, created_at, kind, duration_min, due_at",
    )
    .in("session_id", sessionIds)
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (!enriched.error) return (enriched.data ?? []) as StudentAssignment[];

  // Même principe pour les travaux historiques : aucune colonne facultative ne doit pouvoir
  // rendre un ancien cours ou ses consignes invisibles.
  const legacy = await supabase
    .from("assignments")
    .select(
      "id, instructions, session_id, created_at, kind, duration_min, due_at",
    )
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  return (legacy.data ?? []).map((assignment) => ({
    ...assignment,
    title: null,
    description: null,
    content_type: null,
    resource_url: null,
    file_url: null,
    phase: null,
    sort_order: null,
  })) as StudentAssignment[];
}

export type StudentWorkItem = {
  assignment: StudentAssignment;
  origin: StudentSession;
  targetDate: string | null;
  after: boolean;
};

/**
 * Source unique de synchronisation entre la Home, la fiche cours et « Travail à faire ».
 * Un travail après le cours est rattaché à la prochaine séance réellement pertinente ;
 * un travail avant le cours reste rattaché à sa propre séance.
 */
export function getStudentWorkItems(
  assignments: StudentAssignment[],
  sessions: StudentSession[],
): StudentWorkItem[] {
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  return assignments.flatMap((assignment) => {
    const origin = sessionById.get(assignment.session_id);
    if (!origin) return [];
    const after = assignment.phase
      ? assignment.phase === "after"
      : !!assignment.due_at &&
        new Date(assignment.due_at) >
          new Date(`${origin.session_date}T${origin.end_time}`);
    const target = after ? getNextRelevantSession(origin, sessions) : origin;
    return [{ assignment, origin, targetDate: target?.session_date ?? null, after }];
  });
}

/** Identifiants des travaux que l'étudiant a déjà cochés. */
export async function getStudentCompletedIds(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("assignment_completions")
    .select("assignment_id")
    .eq("user_id", userId);

  return new Set((data ?? []).map((c) => c.assignment_id as string));
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
  userId: string,
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

  return (data ?? []).map((c) => {
    const courseSessions = withCourse
      .filter((s) => s.course_id === c.id)
      .sort(sortByDateThenTime);
    const isFirstPracticeCourse = courseSessions.some(
      (s) =>
        s.session_date === "2026-10-03" && s.start_time.slice(0, 5) === "14:30",
    );

    return {
      id: c.id as string,
      title: isFirstPracticeCourse
        ? "De la formation à l’action"
        : (c.title as string),
      description: c.description as string | null,
      objectives: c.objectives as string | null,
      sessions: courseSessions,
    };
  });
}

export async function getStudentCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
) {
  const courses = await getStudentCourses(supabase, userId);
  return courses.find((c) => c.id === courseId) ?? null;
}
