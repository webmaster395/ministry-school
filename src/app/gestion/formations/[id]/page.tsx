import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Clock3, MapPin, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import BackButton from "@/components/BackButton";
import CourseCreationDialog from "@/components/gestion/CourseCreationDialog";
import AttendanceManager from "@/components/formations/AttendanceManager";
import { enrollDeepeningStudent, removeDeepeningStudent, revokeFormationAssignment, setDeepeningAuthorization, setFormationAssignment } from "../actions";

type Person = { id: string; full_name: string };
type FormationAssignment = { user_id: string; role: "responsible" | "contributor"; can_publish: boolean; person: Person | null };
type Enrollment = { user_id: string; status: string; student: Person | null };
type Session = { id: string; session_date: string; start_time: string; end_time: string; location: string; room: string | null; description: string | null };

export default async function FormationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const supabase = await createClient();
  const [{ data: canView }, { data: canManageFormation }, formationResult, managedIdsResult] = await Promise.all([
    supabase.rpc("can_view_formation", { p_formation: id }),
    supabase.rpc("can_manage_formation", { p_formation: id }),
    supabase.from("formations").select("id,title,description,status,category_key").eq("id", id).maybeSingle(),
    supabase.rpc("managed_formation_session_ids"),
  ]);
  const formation = formationResult.data;
  if (!formation || !canView) notFound();
  const managedIds = new Set(((managedIdsResult.data ?? []) as unknown[]).map((item) => typeof item === "string" ? item : String((item as { managed_formation_session_ids?: string }).managed_formation_session_ids ?? "")));
  const [sessionsResult, assignmentsResult, enrollmentsResult, profilesResult, trainersResult, accessResult] = await Promise.all([
    supabase.from("sessions").select("id,session_date,start_time,end_time,location,room,description").eq("formation_id", id).order("session_date").order("start_time"),
    supabase.from("formation_assignments").select("user_id,role,can_publish,person:profiles!formation_assignments_user_id_fkey(id,full_name)").eq("formation_id", id),
    supabase.from("deepening_enrollments").select("user_id,status,student:profiles!deepening_enrollments_user_id_fkey(id,full_name)").eq("formation_id", id).eq("status", "active").order("assigned_at"),
    viewer.roles.superAdmin ? supabase.from("profiles").select("id,full_name,role").eq("is_test_account", false).eq("deactivated", false).order("full_name") : Promise.resolve({ data: [] }),
    supabase.from("trainers").select("id,first_name,last_name").eq("is_active", true).order("last_name"),
    viewer.roles.superAdmin ? supabase.from("deepening_access").select("user_id,enabled") : Promise.resolve({ data: [] }),
  ] as const);
  // La requête de présences dépend des séances : elle est volontairement isolée
  // pour ne jamais élargir son périmètre à une autre formation.
  const sessions = ((sessionsResult.data ?? []) as Session[]).filter((session) => managedIds.has(session.id));
  const sessionIds = sessions.map((session) => session.id);
  const attendanceRows = sessionIds.length
    ? (await supabase.from("session_attendance").select("session_id,user_id,status").in("session_id", sessionIds)).data ?? []
    : [];
  const team = (assignmentsResult.data ?? []) as unknown as FormationAssignment[];
  const enrollments = (enrollmentsResult.data ?? []) as unknown as Enrollment[];
  const people = (profilesResult.data ?? []) as (Person & { role: string })[];
  const authorizedIds = new Set(((accessResult.data ?? []) as { user_id: string; enabled: boolean }[]).filter((access) => access.enabled).map((access) => access.user_id));
  const students = people.filter((person) => person.role === "student");
  const available = students.filter((person) => authorizedIds.has(person.id) && !enrollments.some((enrollment) => enrollment.user_id === person.id));
  const trainers = (trainersResult.data ?? []).map((trainer) => ({ id: trainer.id, name: `${trainer.first_name} ${trainer.last_name}`.trim() }));
  const teamChoices = people.filter((person) => !team.some((assignment) => assignment.user_id === person.id));

  return <div className="space-y-6">
    <BackButton fallbackHref="/gestion/formations?onglet=approfondissements" fallbackLabel="Retour aux approfondissements" />
    <header className="rounded-2xl border border-border bg-background p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">{formation.status === "published" ? "Publié" : formation.status === "draft" ? "Brouillon" : "Archivé"}</span><h1 className="font-title mt-3 text-[32px] leading-tight text-foreground sm:text-[42px]">{formation.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{formation.description ?? "Formation d’approfondissement du dimanche."}</p></div>{canManageFormation && <CourseCreationDialog context="formation" parentId={id} trainers={trainers} triggerLabel="Ajouter une séance" />}</div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric icon={<CalendarDays size={18} />} value={sessions.length} label="séances" /><Metric icon={<UsersRound size={18} />} value={enrollments.length} label="étudiants inscrits" /><Metric icon={<ShieldCheck size={18} />} value={team.length} label="responsables et contributeurs" /></div></header>

    {viewer.roles.superAdmin && <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-[23px]">Équipe pédagogique</h2><p className="mt-1 text-sm text-muted">Les droits sont limités à cet approfondissement.</p><ul className="mt-4 divide-y divide-border-soft">{team.map((assignment) => <li key={assignment.user_id} className="flex items-center justify-between gap-3 py-3"><span><strong className="block text-sm">{assignment.person?.full_name ?? "Compte"}</strong><span className="text-xs text-muted">{assignment.role === "responsible" ? "Responsable" : "Contributeur"}{assignment.can_publish ? " · publication autorisée" : ""}</span></span><form action={revokeFormationAssignment}><input type="hidden" name="formation_id" value={id} /><input type="hidden" name="user_id" value={assignment.user_id} /><button className="text-xs text-link hover:underline">Révoquer</button></form></li>)}</ul><form action={setFormationAssignment} className="mt-4 grid gap-3 rounded-xl bg-surface p-3 sm:grid-cols-2"><input type="hidden" name="formation_id" value={id} /><select name="user_id" required className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"><option value="">Choisir une personne</option>{teamChoices.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select><select name="role" className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"><option value="responsible">Responsable</option><option value="contributor">Contributeur</option></select><label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="can_publish" value="1" /> Autoriser la publication</label><button className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent">Attribuer</button></form></section>

    <section className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-[23px]">Accès et inscriptions</h2><p className="mt-1 text-sm text-muted">L’autorisation générale et l’inscription à cet approfondissement sont deux étapes distinctes.</p><div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-surface p-3">{students.map((student) => <form action={setDeepeningAuthorization} key={student.id} className="flex items-center justify-between gap-3"><input type="hidden" name="formation_id" value={id} /><input type="hidden" name="user_id" value={student.id} /><input type="hidden" name="enabled" value={authorizedIds.has(student.id) ? "0" : "1"} /><strong className="text-xs">{student.full_name}</strong><button className={`rounded-full px-3 py-1.5 text-xs font-semibold ${authorizedIds.has(student.id) ? "bg-emerald-100 text-emerald-800" : "border border-border bg-background text-muted"}`}>{authorizedIds.has(student.id) ? "Autorisé · retirer" : "Autoriser"}</button></form>)}</div><ul className="mt-4 max-h-64 divide-y divide-border-soft overflow-y-auto">{enrollments.map((enrollment) => <li key={enrollment.user_id} className="flex items-center justify-between gap-3 py-3"><strong className="text-sm">{enrollment.student?.full_name ?? "Étudiant"}</strong><form action={removeDeepeningStudent}><input type="hidden" name="formation_id" value={id} /><input type="hidden" name="user_id" value={enrollment.user_id} /><button className="text-xs text-link hover:underline">Retirer de cette formation</button></form></li>)}</ul><form action={enrollDeepeningStudent} className="mt-4 grid gap-3 rounded-xl bg-surface p-3"><input type="hidden" name="formation_id" value={id} /><label className="text-xs font-semibold text-muted">Inscrire parmi les étudiants autorisés<select multiple name="user_id" size={Math.min(7, Math.max(3, available.length))} className="mt-2 w-full rounded-xl border border-border bg-background p-2 text-sm">{available.map((person) => <option key={person.id} value={person.id} className="rounded px-2 py-1.5">{person.full_name}</option>)}</select></label><button className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent" disabled={!available.length}><UserPlus size={16} /> Ajouter les étudiants sélectionnés</button></form></section></div>}

    <section className="space-y-4"><div><h2 className="font-title text-[27px]">Séances et présences</h2><p className="mt-1 text-sm text-muted">Chaque présence est indépendante et ouvre uniquement les ressources de cette séance.</p></div>{sessions.length ? sessions.map((session) => { const stateOf = new Map(attendanceRows.filter((row) => row.session_id === session.id).map((row) => [row.user_id, row.status as "unknown" | "present" | "absent"])); return <article key={session.id} className="rounded-2xl border border-border bg-background p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-title text-[22px]">{session.description ?? "Séance"}</h3><p className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted"><span className="inline-flex items-center gap-1.5"><CalendarDays size={15} /> {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(`${session.session_date}T12:00:00`))}</span><span className="inline-flex items-center gap-1.5"><Clock3 size={15} /> {session.start_time.slice(0,5)}–{session.end_time.slice(0,5)}</span><span className="inline-flex items-center gap-1.5"><MapPin size={15} /> {session.location}{session.room ? ` · ${session.room}` : ""}</span></p></div><Link href={`/gestion/enseignement/preparation/${session.id}`} className="rounded-full border border-border px-4 py-2.5 text-center text-sm font-semibold hover:border-foreground">Gérer la fiche, les ressources et les devoirs</Link></div><div className="mt-4"><AttendanceManager formationId={id} sessionId={session.id} students={enrollments.map((enrollment) => ({ id: enrollment.user_id, name: enrollment.student?.full_name ?? "Étudiant", status: stateOf.get(enrollment.user_id) ?? "unknown" }))} /></div></article>; }) : <p className="rounded-2xl border border-dashed border-border bg-background px-5 py-10 text-center text-sm text-muted">Aucune séance. Utilisez « Ajouter une séance » pour planifier le premier dimanche.</p>}</section>
  </div>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) { return <div className="flex items-center gap-3 rounded-xl bg-surface p-3"><span className="text-muted">{icon}</span><span><strong className="block text-lg tabular-nums">{value}</strong><span className="text-xs text-muted">{label}</span></span></div>; }
