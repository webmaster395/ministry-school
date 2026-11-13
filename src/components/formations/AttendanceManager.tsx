import FormSubmitButton from "@/components/FormSubmitButton";
import { saveSessionAttendance } from "@/app/gestion/formations/actions";

type Student = { id: string; name: string; status: "unknown" | "present" | "absent" };

export default function AttendanceManager({ formationId, sessionId, students }: { formationId: string; sessionId: string; students: Student[] }) {
  const present = students.filter((student) => student.status === "present").length;
  const absent = students.filter((student) => student.status === "absent").length;
  return <details className="rounded-xl border border-border bg-surface/40 p-4">
    <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">Présences · {present} présents · {absent} absents · {students.length - present - absent} à renseigner</summary>
    <form action={saveSessionAttendance} className="mt-4 space-y-3">
      <input type="hidden" name="formation_id" value={formationId} />
      <input type="hidden" name="session_id" value={sessionId} />
      <div className="max-h-[420px] divide-y divide-border-soft overflow-y-auto rounded-xl border border-border bg-background px-4">
        {students.map((student) => <label key={student.id} className="grid min-h-14 grid-cols-[1fr_150px] items-center gap-3 py-2 text-sm"><span className="font-medium text-foreground">{student.name}</span><select name={`attendance:${student.id}`} defaultValue={student.status} className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="unknown">Non renseigné</option><option value="present">Présent</option><option value="absent">Absent</option></select></label>)}
      </div>
      <div className="flex justify-end"><FormSubmitButton label="Enregistrer les présences" pendingLabel="Enregistrement…" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent" /></div>
    </form>
  </details>;
}
