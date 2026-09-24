import { SupabaseClient } from "@supabase/supabase-js";

export type EnrollmentBreakdown = {
  byMinistry: { name: string; slug?: string; count: number }[];
  byDay: { day: string; count: number }[];
  byGender: {
    men: number;
    women: number;
    unassigned: number;
  };
};

export async function getEnrollmentBreakdown(
  supabase: SupabaseClient
): Promise<EnrollmentBreakdown> {
  const { data: ministries } = await supabase.from("ministries").select("id, name, slug").order("name");

  // Requête tolérante sur profiles : si la colonne gender existe, on la récupère, sinon fallback
  let rows: { ministry_id: string | null; preferred_day: string | null; gender?: string | null }[] = [];
  const { data: studentsWithGender, error } = await supabase
    .from("profiles")
    .select("ministry_id, preferred_day, gender")
    .eq("role", "student");

  if (error) {
    const { data: fallbackStudents } = await supabase
      .from("profiles")
      .select("ministry_id, preferred_day")
      .eq("role", "student");
    rows = (fallbackStudents as typeof rows) ?? [];
  } else {
    rows = (studentsWithGender as typeof rows) ?? [];
  }

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

  const men = rows.filter((s) => s.gender === "homme").length;
  const women = rows.filter((s) => s.gender === "femme").length;
  const unassignedGender = rows.filter((s) => s.gender !== "homme" && s.gender !== "femme").length;

  return {
    byMinistry,
    byDay,
    byGender: {
      men,
      women,
      unassigned: unassignedGender,
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
};

export async function getAllSessions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, session_type, description, track, speaker_name, summary, objectives, bible_refs, ministries(name), courses(title), teacher:profiles!sessions_teacher_id_fkey(full_name)"
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
    .order("created_at", { ascending: false });

  if (error) {
    const { data: fallback } = await supabase
      .from("profiles")
      .select("id, full_name, role, preferred_day, email_confirmed, created_at, ministries!profiles_ministry_id_fkey(name, slug)")
      .eq("role", "student")
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
