import { SupabaseClient } from "@supabase/supabase-js";

export async function getGlobalStats(supabase: SupabaseClient) {
  const [
    { count: studentCount },
    { count: confirmedCount },
    { count: teacherCount },
    { count: sessionCount },
    { count: materialCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("email_confirmed", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("sessions").select("id", { count: "exact", head: true }),
    supabase.from("materials").select("id", { count: "exact", head: true }),
  ]);

  const students = studentCount ?? 0;
  const confirmed = confirmedCount ?? 0;

  return {
    studentCount: students,
    confirmedCount: confirmed,
    pendingCount: students - confirmed,
    teacherCount: teacherCount ?? 0,
    sessionCount: sessionCount ?? 0,
    materialCount: materialCount ?? 0,
  };
}

export type EnrollmentBreakdown = {
  byMinistry: { name: string; slug?: string; count: number }[];
  byDay: { day: string; count: number }[];
};

export async function getEnrollmentBreakdown(
  supabase: SupabaseClient
): Promise<EnrollmentBreakdown> {
  const [{ data: ministries }, { data: students }] = await Promise.all([
    supabase.from("ministries").select("id, name, slug").order("name"),
    supabase.from("profiles").select("ministry_id, preferred_day").eq("role", "student"),
  ]);

  const rows = students ?? [];

  const byMinistry: EnrollmentBreakdown["byMinistry"] = (ministries ?? []).map((m) => ({
    name: m.name as string,
    slug: m.slug as string,
    count: rows.filter((s) => s.ministry_id === m.id).length,
  }));

  const unassigned = rows.filter((s) => !s.ministry_id).length;
  if (unassigned > 0) {
    byMinistry.push({ name: "Non renseigné", count: unassigned });
  }

  const byDay = [
    { day: "Samedi", count: rows.filter((s) => s.preferred_day === "samedi").length },
    { day: "Dimanche", count: rows.filter((s) => s.preferred_day === "dimanche").length },
  ];

  return { byMinistry, byDay };
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
};

export async function getAllSessions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, session_type, ministries(name), courses(title), teacher:profiles!sessions_teacher_id_fkey(full_name)"
    )
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  return (data ?? []) as unknown as AdminSession[];
}

export type AdminUser = {
  id: string;
  full_name: string;
  role: string;
  preferred_day: string | null;
  email_confirmed: boolean;
  created_at: string;
  ministries: { name: string; slug: string } | null;
};

export async function getAllUsers(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, preferred_day, email_confirmed, created_at, ministries(name, slug)")
    .order("role")
    .order("full_name");

  return (data ?? []) as unknown as AdminUser[];
}

export async function getStudents(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, preferred_day, email_confirmed, created_at, ministries(name, slug)")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as AdminUser[];
}

export type Ministry = { id: string; slug: string; name: string };

export async function getMinistries(supabase: SupabaseClient) {
  const { data } = await supabase.from("ministries").select("id, slug, name").order("name");
  return (data ?? []) as Ministry[];
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
