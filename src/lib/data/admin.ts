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
    supabase.from("profiles").select("id, ministry_id, gender, notification_prefs"),
    supabase.rpc("admin_user_emails"),
  ]);

  if (error) {
    const { data: fallbackStudents } = await supabase
      .from("profiles")
      .select("id, ministry_id, notification_prefs");
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
