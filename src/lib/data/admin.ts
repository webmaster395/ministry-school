import { SupabaseClient } from "@supabase/supabase-js";
import { isDemoAdminEmail } from "@/lib/demo-admin";
import { parseMlkEngagement } from "@/lib/mlk-engagement";

export type EnrollmentBreakdown = {
  byMinistry: { name: string; slug?: string; count: number }[];
  byGender: {
    men: number;
    women: number;
    unassigned: number;
  };
  engagement: {
    none: number;
    equipiers: number;
    managers: number;
    collaborators: number;
    unassigned: number;
  };
};

export async function getEnrollmentBreakdown(
  supabase: SupabaseClient
): Promise<EnrollmentBreakdown> {
  const { data: ministries } = await supabase.from("ministries").select("id, name, slug").order("name");

  // Tout le monde est compté (administrateurs, formateurs, étudiants) : pas de distinction pour le moment.
  // Requête tolérante sur profiles : si la colonne gender existe, on la récupère, sinon fallback
  let rows: { id: string; ministry_id: string | null; gender?: string | null; notification_prefs?: unknown }[] = [];
  const [{ data: studentsWithGender, error }, { data: emails }] = await Promise.all([
    supabase.from("profiles").select("id, ministry_id, gender, notification_prefs").eq("is_test_account", false),
    supabase.rpc("admin_user_emails"),
  ]);

  if (error) {
    const { data: fallbackStudents } = await supabase
      .from("profiles")
      .select("id, ministry_id, notification_prefs")
      .eq("is_test_account", false);
    rows = (fallbackStudents as typeof rows) ?? [];
  } else {
    rows = (studentsWithGender as typeof rows) ?? [];
  }

  const demoAdminId = ((emails ?? []) as { id: string; email: string }[]).find((entry) =>
    isDemoAdminEmail(entry.email)
  )?.id;
  if (demoAdminId) {
    rows = rows.map((row) =>
      row.id === demoAdminId ? { ...row, ministry_id: null } : row
    );
  }

  const byMinistry: EnrollmentBreakdown["byMinistry"] = (ministries ?? []).map((m: { id: string; name: string; slug: string }) => ({
    name: m.name as string,
    slug: m.slug as string,
    count: rows.filter((s) => s.ministry_id === m.id).length,
  }));

  const unassigned = rows.filter((s) => !s.ministry_id).length;
  if (unassigned > 0) {
    byMinistry.push({ name: "Ne sais pas encore", count: unassigned });
  }

  const men = rows.filter((s) => s.gender === "homme").length;
  const women = rows.filter((s) => s.gender === "femme").length;
  const unassignedGender = rows.filter((s) => s.gender !== "homme" && s.gender !== "femme").length;
  const engagement = rows.map((row) => parseMlkEngagement(row.notification_prefs));

  return {
    byMinistry,
    byGender: {
      men,
      women,
      unassigned: unassignedGender,
    },
    engagement: {
      none: engagement.filter((item) => item.completed && item.none).length,
      equipiers: engagement.filter((item) => item.completed && item.equipier).length,
      managers: engagement.filter((item) => item.completed && item.manager).length,
      collaborators: engagement.filter((item) => item.completed && item.collaborator).length,
      unassigned: engagement.filter((item) => !item.completed).length,
    },
  };
}

export type AdminSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  room: string | null;
  session_type: "commun" | "ministere";
  ministries: { name: string } | null;
  courses: { title: string } | null;
  teacher: { full_name: string } | null;
  description: string | null;
  track: string | null;
  speaker_name: string | null;
  summary: string | null;
  objectives: string | null;
  bible_refs: string | null;
  show_parking_notice: boolean;
};

export async function getAllSessions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, session_type, description, track, speaker_name, summary, objectives, bible_refs, show_parking_notice, ministries(name), courses(title), teacher:profiles!sessions_teacher_id_fkey(full_name)"
    )
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  return (data ?? []) as unknown as AdminSession[];
}

export type AdminUser = {
  id: string;
  full_name: string;
  role: string;
  gender: string | null;
  preferred_day: string | null;
  email_confirmed: boolean;
  created_at: string;
  ministries: { name: string; slug: string } | null;
};

export async function getStudents(supabase: SupabaseClient) {
  let list: unknown[] = [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, gender, preferred_day, email_confirmed, created_at, ministries!profiles_ministry_id_fkey(name, slug)")
    .eq("role", "student")
    .eq("is_test_account", false)
    .order("created_at", { ascending: false });

  if (error) {
    const { data: fallback } = await supabase
      .from("profiles")
      .select("id, full_name, role, preferred_day, email_confirmed, created_at, ministries!profiles_ministry_id_fkey(name, slug)")
      .eq("role", "student")
      .eq("is_test_account", false)
      .order("created_at", { ascending: false });
    list = fallback ?? [];
  } else {
    list = data ?? [];
  }

  return list as unknown as AdminUser[];
}

export type Ministry = { id: string; slug: string; name: string };

export async function getMinistries(supabase: SupabaseClient) {
  const { data } = await supabase.from("ministries").select("id, slug, name").order("name");
  return (data ?? []) as Ministry[];
}

/** Dates réelles des journées ayant au moins un cours dans le programme. */
export async function getTrainingDayDates(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("sessions")
    .select("session_date")
    .order("session_date");
  return [...new Set((data ?? []).map((session) => session.session_date as string))];
}

export type MonthlyActiveUsers = {
  activity_month: string;
  active_users: number;
};

/** Utilisateurs réels distincts ayant réussi au moins une connexion pendant le mois. */
export async function getMonthlyActiveUsers(supabase: SupabaseClient): Promise<MonthlyActiveUsers[]> {
  const { data, error } = await supabase.rpc("admin_monthly_active_users");
  if (error) throw error;
  return ((data ?? []) as { activity_month: string; active_users: number | string }[]).map((row) => ({
    activity_month: row.activity_month,
    active_users: Number(row.active_users),
  }));
}

export type UsageAnalytics = {
  weekly: { week_start: string; active_users: number }[];
  pages: { page_key: string; views: number; unique_users: number }[];
  downloads: { material_id: string; document_title: string; course_title: string; downloads: number; unique_users: number }[];
  accounts: { never_signed_in: number; disabled_accounts: number; observed_since_tracking: number };
};

export async function getUsageAnalytics(supabase: SupabaseClient): Promise<UsageAnalytics> {
  const [weeklyResult, pagesResult, downloadsResult, accountsResult] = await Promise.all([
    supabase.rpc("admin_weekly_active_users"),
    supabase.rpc("admin_page_usage"),
    supabase.rpc("admin_material_downloads"),
    supabase.rpc("admin_account_usage_state"),
  ]);
  const error = weeklyResult.error ?? pagesResult.error ?? downloadsResult.error ?? accountsResult.error;
  if (error) throw error;
  const number = (value: number | string) => Number(value);
  return {
    weekly: ((weeklyResult.data ?? []) as { week_start: string; active_users: number | string }[]).map((row) => ({ ...row, active_users: number(row.active_users) })),
    pages: ((pagesResult.data ?? []) as { page_key: string; views: number | string; unique_users: number | string }[]).map((row) => ({ ...row, views: number(row.views), unique_users: number(row.unique_users) })),
    downloads: ((downloadsResult.data ?? []) as { material_id: string; document_title: string; course_title: string; downloads: number | string; unique_users: number | string }[]).map((row) => ({ ...row, downloads: number(row.downloads), unique_users: number(row.unique_users) })),
    accounts: (() => {
      const row = (accountsResult.data?.[0] ?? {}) as Record<string, number | string>;
      return { never_signed_in: number(row.never_signed_in ?? 0), disabled_accounts: number(row.disabled_accounts ?? 0), observed_since_tracking: number(row.observed_since_tracking ?? 0) };
    })(),
  };
}

export type ProgramAnalytics = {
  courseCount: number;
  trainerCount: number;
  hours: number;
  resourceCount: number;
  totalDownloads: number;
  tracks: { label: string; courses: number; trainers: number; hours: number; resources: number }[];
};

const timeMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export async function getProgramAnalytics(supabase: SupabaseClient, downloads: UsageAnalytics["downloads"]): Promise<ProgramAnalytics> {
  const [sessionsResult, trainersResult, materialsResult] = await Promise.all([
    supabase.from("sessions").select("id, start_time, end_time, track").or("is_draft.eq.false,is_draft.is.null"),
    supabase.from("session_trainers").select("session_id, trainer_id"),
    supabase.from("materials").select("id, session_id"),
  ]);
  const sessions = (sessionsResult.data ?? []) as { id: string; start_time: string; end_time: string; track: string | null }[];
  const trainers = (trainersResult.data ?? []) as { session_id: string; trainer_id: string }[];
  const materials = (materialsResult.data ?? []) as { id: string; session_id: string }[];
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const trackLabels = [...new Set(sessions.map((session) => session.track?.trim() || "Autres"))];
  const duration = (session: (typeof sessions)[number]) => Math.max(0, timeMinutes(session.end_time) - timeMinutes(session.start_time)) / 60;
  return {
    courseCount: sessions.length,
    trainerCount: new Set(trainers.filter((row) => sessionById.has(row.session_id)).map((row) => row.trainer_id)).size,
    hours: sessions.reduce((sum, session) => sum + duration(session), 0),
    resourceCount: materials.filter((material) => sessionById.has(material.session_id)).length,
    totalDownloads: downloads.reduce((sum, item) => sum + item.downloads, 0),
    tracks: trackLabels.map((label) => {
      const trackSessions = sessions.filter((session) => (session.track?.trim() || "Autres") === label);
      const ids = new Set(trackSessions.map((session) => session.id));
      return {
        label,
        courses: trackSessions.length,
        trainers: new Set(trainers.filter((row) => ids.has(row.session_id)).map((row) => row.trainer_id)).size,
        hours: trackSessions.reduce((sum, session) => sum + duration(session), 0),
        resources: materials.filter((material) => ids.has(material.session_id)).length,
      };
    }).sort((a, b) => b.hours - a.hours),
  };
}

export type Course = {
  id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  ministries: { name: string } | null;
};

export async function getCourses(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("courses")
    .select("id, title, description, objectives, ministries(name)")
    .order("title");
  return (data ?? []) as unknown as Course[];
}

export type Teacher = { id: string; full_name: string };

export async function getTeachers(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "teacher")
    .order("full_name");
  return (data ?? []) as Teacher[];
}
