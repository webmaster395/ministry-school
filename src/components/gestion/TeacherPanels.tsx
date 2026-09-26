import type { ReactNode } from "react";
import { FileText, X } from "lucide-react";
import ResourceDialog from "@/components/ResourceDialog";
import MaterialLink from "@/components/MaterialLink";
import { updateSession } from "@/lib/actions/sessions";
import {
  addObjective,
  addPilotAssignment,
  deleteAssignment,
  deleteSupport,
  removeObjective,
  updateAssignment,
  updateObjective,
  updateSupport,
} from "@/app/gestion/pilotage/actions";
import { isAfterClass, type PilotSession } from "@/lib/data/pilotage";

const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] text-foreground";
const save =
  "label rounded-full bg-accent px-5 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221]";
const soft =
  "shrink-0 whitespace-nowrap rounded-full border border-border bg-surface px-4 py-2.5 text-[14px] text-foreground transition hover:border-foreground";

type Assignment = { id: string; instructions: string; kind: string | null; duration_min: number | null; due_at: string | null };
type Material = { id: string; title: string; link_url: string | null; file_url: string | null; visible_at?: string | null; resource_type?: string | null };

/** Bouton « Supprimer » discret, en formulaire (fonctionne sans JavaScript). */
function Remove({ action, fields }: { action: (f: FormData) => Promise<void>; fields: Record<string, string> }) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className="text-[14px] text-muted transition hover:text-foreground">
        Supprimer
      </button>
    </form>
  );
}

/** « Modifier » replié : un petit formulaire sous la ligne, pour corriger sur place. */
function Edit({ children, action }: { children: ReactNode; action: (f: FormData) => Promise<void> }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-[14px] text-link hover:underline">Modifier</summary>
      <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
        {children}
        <button type="submit" className={soft}>Enregistrer</button>
      </form>
    </details>
  );
}

/**
 * Contenu des cinq parties de la préparation d'un cours (présentation, objectifs, à préparer
 * avant le cours, supports, travail après le cours). Utilisé sur « Mes cours » et sur la page
 * de préparation : on ajoute et on retire sur place.
 */
export function teacherPanels(s: PilotSession, assignments: Assignment[], materialRows: readonly unknown[]): Record<string, ReactNode> {
  const materials = materialRows as Material[];
  const before = assignments.filter((a) => !isAfterClass(a.due_at, s.session_date));
  const after = assignments.filter((a) => isAfterClass(a.due_at, s.session_date));
  const at = (time: string) => new Date(`${s.session_date}T${time.slice(0, 5)}:00`).getTime();
  /** Moment où la ressource devient visible, par rapport au cours. */
  const visibilityOf = (visibleAt: string | null | undefined) => {
    if (!visibleAt) return "";
    const t = new Date(visibleAt).getTime();
    if (Math.abs(t - at(s.start_time)) < 60000) return "Visible au début du cours";
    if (Math.abs(t - at(s.end_time)) < 60000) return "Visible après le cours";
    return "Visible dès l'ajout";
  };
  const objectives = (s.objectives ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  /** Les autres champs de la séance repartent tels quels : on ne change que ce qui est modifié ici. */
  const keep = (
    <>
      <input type="hidden" name="session_id" value={s.id} />
      <input type="hidden" name="description" value={s.description ?? ""} />
      <input type="hidden" name="track" value={s.track ?? ""} />
      <input type="hidden" name="speaker_name" value={s.speaker_name ?? ""} />
      <input type="hidden" name="session_date" value={s.session_date} />
      <input type="hidden" name="start_time" value={s.start_time.slice(0, 5)} />
      <input type="hidden" name="end_time" value={s.end_time.slice(0, 5)} />
      <input type="hidden" name="location" value={s.location} />
      <input type="hidden" name="room" value={s.room ?? ""} />
    </>
  );

  /** Après le cours : échéance une semaine plus tard, à l'heure du cours (nécessaire pour les distinguer des consignes d'avant). */
  const afterDue = (() => {
    const d = new Date(`${s.session_date}T${s.start_time.slice(0, 5)}:00`);
    d.setDate(d.getDate() + 7);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  })();

  const assignmentList = (rows: Assignment[]) =>
    rows.length > 0 && (
      <ul className="mb-4 divide-y divide-border-soft">
        {rows.map((a) => (
          <li key={a.id} className="flex flex-wrap items-start gap-3 py-3">
            <FileText size={20} className="shrink-0 text-foreground" strokeWidth={1.6} />
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold text-foreground">{a.instructions}</span>
              {(a.kind || a.duration_min) && (
                <span className="block text-[14px] text-muted">
                  {[a.kind, a.duration_min ? `${a.duration_min} min` : null].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Remove action={deleteAssignment} fields={{ id: a.id, session_id: s.id }} />
              <Edit action={updateAssignment}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="session_id" value={s.id} />
                <input name="instructions" required defaultValue={a.instructions} className={`${field} min-w-[220px] flex-1`} />
                <input name="duration_min" type="number" min={1} placeholder="min" defaultValue={a.duration_min ?? ""} className={`${field} w-[88px]`} />
              </Edit>
            </div>
          </li>
        ))}
      </ul>
    );

  const quickAdd = (placeholder: string, button: string, due?: string) => (
    <form action={addPilotAssignment} className="flex flex-wrap gap-3 sm:flex-nowrap">
      <input type="hidden" name="session_id" value={s.id} />
      {due && <input type="hidden" name="due_at" value={due} />}
      <input name="instructions" required placeholder={placeholder} className={`${field} min-w-0 flex-1`} />
      <button type="submit" className={soft}>{button}</button>
    </form>
  );

  return {
    presentation: (
      <form action={updateSession} className="space-y-3">
        {keep}
        <input type="hidden" name="objectives" value={s.objectives ?? ""} />
        <label className="block text-[15px] text-muted" htmlFor="tp-summary">
          Présentez en quelques lignes le sujet et l&apos;intérêt de ce cours pour les étudiants.
        </label>
        <textarea id="tp-summary" name="summary" rows={5} defaultValue={s.summary ?? ""} className={field} />
        <button type="submit" className={save}>Enregistrer</button>
      </form>
    ),
    objectifs: (
      <div>
        {objectives.length > 0 && (
          <ul className="mb-4 divide-y divide-border-soft">
            {objectives.map((o, i) => (
              <li key={`${i}-${o}`} className="flex flex-wrap items-start gap-3 py-2.5 text-[16px] text-foreground">
                <span className="min-w-0 flex-1">{o}</span>
                <Edit action={updateObjective}>
                  <input type="hidden" name="session_id" value={s.id} />
                  <input type="hidden" name="index" value={i} />
                  <input name="objective" required defaultValue={o} className={`${field} min-w-[220px] flex-1`} />
                </Edit>
                <form action={removeObjective}>
                  <input type="hidden" name="session_id" value={s.id} />
                  <input type="hidden" name="index" value={i} />
                  <button type="submit" aria-label="Retirer cet objectif" className="rounded-md p-1.5 text-muted transition hover:bg-foreground/[0.06] hover:text-foreground">
                    <X size={16} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addObjective} className="flex flex-wrap gap-3 sm:flex-nowrap">
          <input type="hidden" name="session_id" value={s.id} />
          <input name="objective" required placeholder="Ajouter un objectif" className={`${field} min-w-0 flex-1`} />
          <button type="submit" className={soft}>Ajouter un objectif</button>
        </form>
      </div>
    ),
    consignes: (
      <div>
        <p className="mb-3 text-[15px] text-muted">
          Ajoutez une lecture, une vidéo, un document ou une réflexion à préparer avant la session.
        </p>
        {assignmentList(before)}
        {quickAdd("Titre de l'élément à préparer", "Ajouter un élément à préparer")}
      </div>
    ),
    supports: (
      <div>
        {materials.length > 0 && (
          <ul className="mb-4 divide-y divide-border-soft">
            {materials.map((m) => (
              <li key={m.id} className="flex flex-wrap items-start gap-3 py-3 text-[15px]">
                <span className="min-w-0 flex-1">
                  <MaterialLink title={m.title} url={m.link_url ?? m.file_url} />
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {[m.resource_type, visibilityOf(m.visible_at)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Remove action={deleteSupport} fields={{ id: m.id, session_id: s.id }} />
                  <Edit action={updateSupport}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="session_id" value={s.id} />
                    <input name="title" required defaultValue={m.title} className={`${field} min-w-[200px] flex-1`} />
                    {m.link_url !== null && <input name="link_url" defaultValue={m.link_url ?? ""} placeholder="Lien" className={`${field} min-w-[200px] flex-1`} />}
                  </Edit>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ResourceDialog sessionId={s.id} withTypes />
      </div>
    ),
    apres: (
      <div>
        <p className="mb-3 text-[15px] text-muted">
          Ajoutez ce que les étudiants devront réaliser après la session. Ils le retrouvent dans « Travail à faire ».
        </p>
        {assignmentList(after)}
        {quickAdd("Titre du travail", "Ajouter un travail", afterDue)}
      </div>
    ),
  };
}
