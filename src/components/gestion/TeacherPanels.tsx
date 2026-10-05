import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import ResourceDialog from "@/components/ResourceDialog";
import MaterialLink from "@/components/MaterialLink";
import FormSubmitButton from "@/components/FormSubmitButton";
import RichTextEditor from "@/components/gestion/RichTextEditor";
import { updateSession } from "@/lib/actions/sessions";
import {
  addObjective,
  addPilotAssignment,
  deleteAssignment,
  duplicateAssignment,
  deleteSupport,
  removeObjective,
  updateAssignment,
  updateObjective,
  moveObjective,
  moveSupport,
  moveAssignment,
  updateSupport,
} from "@/app/gestion/pilotage/actions";
import { isAfterClass, type PilotSession } from "@/lib/data/pilotage";

const field =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] text-foreground";
const save =
  "label rounded-full bg-accent px-5 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221]";
const soft =
  "shrink-0 whitespace-nowrap rounded-full border border-border bg-surface px-4 py-2.5 text-[14px] text-foreground transition hover:border-foreground";

type Assignment = {
  id: string;
  title?: string | null;
  description?: string | null;
  instructions: string;
  content_type?: string | null;
  resource_url?: string | null;
  file_url?: string | null;
  phase?: string | null;
  sort_order?: number;
  kind: string | null;
  duration_min: number | null;
  due_at: string | null;
};
type Material = {
  id: string;
  title: string;
  description?: string | null;
  sort_order?: number;
  link_url: string | null;
  file_url: string | null;
  visible_at?: string | null;
  resource_type?: string | null;
};

/** Bouton « Supprimer » discret, en formulaire (fonctionne sans JavaScript). */
function Remove({
  action,
  fields,
}: {
  action: (f: FormData) => Promise<void>;
  fields: Record<string, string>;
}) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className="text-[14px] text-muted transition hover:text-foreground"
      >
        Supprimer
      </button>
    </form>
  );
}

/** « Modifier » replié : un petit formulaire sous la ligne, pour corriger sur place. */
function Edit({
  children,
  action,
}: {
  children: ReactNode;
  action: (f: FormData) => Promise<void>;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-[14px] text-link hover:underline">
        Modifier
      </summary>
      <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
        {children}
        <FormSubmitButton className={soft} />
      </form>
    </details>
  );
}

/**
 * Contenu des cinq parties de la préparation d'un cours (présentation, objectifs, à préparer
 * avant le cours, supports, travail après le cours). Utilisé sur « Mes cours » et sur la page
 * de préparation : on ajoute et on retire sur place.
 */
export function teacherPanels(
  s: PilotSession,
  assignments: Assignment[],
  materialRows: readonly unknown[],
): Record<string, ReactNode> {
  const materials = materialRows as Material[];
  const before = assignments.filter((a) =>
    a.phase ? a.phase === "before" : !isAfterClass(a.due_at, s.session_date),
  );
  const after = assignments.filter((a) =>
    a.phase ? a.phase === "after" : isAfterClass(a.due_at, s.session_date),
  );
  const at = (time: string) =>
    new Date(`${s.session_date}T${time.slice(0, 5)}:00`).getTime();
  /** Moment où la ressource devient visible, par rapport au cours. */
  const visibilityOf = (visibleAt: string | null | undefined) => {
    if (!visibleAt) return "";
    const t = new Date(visibleAt).getTime();
    if (Math.abs(t - at(s.start_time)) < 60000)
      return "Visible au début du cours";
    if (Math.abs(t - at(s.end_time)) < 60000) return "Visible après le cours";
    return "Visible dès l'ajout";
  };
  const objectives = (s.objectives ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

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
      <ul className="mb-5 space-y-3">
        {rows.map((a, rowIndex) => (
          <li
            key={a.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-xs font-semibold text-muted">
                {rowIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
                    {a.content_type || "Travail"}
                  </span>
                  <h5 className="font-semibold text-foreground">
                    {a.title || a.instructions}
                  </h5>
                </div>
                {a.instructions && a.instructions !== a.title && (
                  <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-6 text-muted">
                    {a.instructions
                      .replace(/^#{1,6}\s+/gm, "")
                      .replace(/\*\*/g, "")}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {a.duration_min && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={13} />
                      {a.duration_min} min
                    </span>
                  )}
                  {(a.resource_url || a.file_url) && (
                    <span className="inline-flex items-center gap-1">
                      <ExternalLink size={13} />
                      Ressource jointe
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <form action={moveAssignment} className="flex">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="session_id" value={s.id} />
                  <button
                    name="direction"
                    value="up"
                    disabled={rowIndex === 0}
                    aria-label="Monter"
                    className="rounded-lg p-2 text-muted hover:bg-surface disabled:opacity-25"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    name="direction"
                    value="down"
                    disabled={rowIndex === rows.length - 1}
                    aria-label="Descendre"
                    className="rounded-lg p-2 text-muted hover:bg-surface disabled:opacity-25"
                  >
                    <ChevronDown size={16} />
                  </button>
                </form>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-soft pt-3">
              <details className="group flex-1">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground hover:bg-surface">
                  <Pencil size={14} />
                  Modifier
                </summary>
                <form
                  action={updateAssignment}
                  className="mt-3 grid gap-2.5 rounded-xl bg-surface p-3 sm:grid-cols-2"
                >
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="session_id" value={s.id} />
                  <input
                    name="title"
                    required
                    defaultValue={a.title ?? a.instructions}
                    placeholder="Titre"
                    className={field}
                  />
                  <select
                    name="content_type"
                    defaultValue={a.content_type ?? "Travail personnel"}
                    className={field}
                  >
                    <option>Travail personnel</option>
                    <option>Consigne</option>
                    <option>Lecture</option>
                    <option>Vidéo</option>
                    <option>PDF</option>
                    <option>Lien</option>
                    <option>Question de réflexion</option>
                    <option>Exercice</option>
                    <option>Devoir</option>
                  </select>
                  <RichTextEditor
                    name="instructions"
                    rows={12}
                    defaultValue={a.instructions}
                    placeholder="Rédigez le travail et structurez-le avec les outils de mise en forme."
                  />
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={a.description ?? ""}
                    placeholder="Description facultative"
                    className={`${field} sm:col-span-2`}
                  />
                  <input
                    name="resource_url"
                    type="url"
                    defaultValue={a.resource_url ?? ""}
                    placeholder="Lien facultatif"
                    className={field}
                  />
                  <input
                    name="duration_min"
                    type="number"
                    min={1}
                    placeholder="Durée estimée (min)"
                    defaultValue={a.duration_min ?? ""}
                    className={field}
                  />
                  <FormSubmitButton
                    className={`${save} sm:col-span-2 sm:justify-self-start`}
                  />
                </form>
              </details>
              <form action={duplicateAssignment}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="session_id" value={s.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-foreground"
                >
                  <Copy size={14} />
                  Dupliquer
                </button>
              </form>
              <form action={deleteAssignment}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="session_id" value={s.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    );

  const quickAdd = (
    placeholder: string,
    button: string,
    phase: "before" | "after",
    due?: string,
  ) => (
    <details className="group rounded-xl border border-dashed border-border bg-background">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-surface">
        ＋ {button}
      </summary>
      <form
        action={addPilotAssignment}
        className="grid gap-2.5 border-t border-border-soft p-4 sm:grid-cols-2"
      >
        <input type="hidden" name="session_id" value={s.id} />
        {due && <input type="hidden" name="due_at" value={due} />}
        <input type="hidden" name="phase" value={phase} />
        <input
          name="title"
          required
          placeholder={placeholder}
          className={field}
        />
        <select
          name="content_type"
          defaultValue={phase === "after" ? "Travail personnel" : "Consigne"}
          className={field}
        >
          <option>Travail personnel</option>
          <option>Consigne</option>
          <option>Lecture</option>
          <option>Vidéo</option>
          <option>PDF</option>
          <option>Lien</option>
          <option>Question de réflexion</option>
          <option>Exercice</option>
          <option>Devoir</option>
        </select>
        <RichTextEditor
          name="instructions"
          rows={8}
          placeholder="Rédigez le travail et structurez-le avec les outils de mise en forme."
        />
        <input
          name="resource_url"
          type="url"
          placeholder="Lien facultatif"
          className={field}
        />
        <input
          name="duration_min"
          type="number"
          min={1}
          placeholder="Durée estimée (min)"
          className={field}
        />
        <button
          type="submit"
          className={`${save} sm:col-span-2 sm:justify-self-start`}
        >
          Ajouter
        </button>
      </form>
    </details>
  );

  return {
    presentation: (
      <form action={updateSession} className="space-y-3">
        {keep}
        <input type="hidden" name="objectives" value={s.objectives ?? ""} />
        <label className="block text-[15px] text-muted" htmlFor="tp-summary">
          Présentez en quelques lignes le sujet et l&apos;intérêt de ce cours
          pour les étudiants.
        </label>
        <textarea
          id="tp-summary"
          name="summary"
          rows={5}
          defaultValue={s.summary ?? ""}
          className={field}
        />
        <FormSubmitButton className={save} />
      </form>
    ),
    objectifs: (
      <div>
        {objectives.length > 0 && (
          <ul className="mb-4 divide-y divide-border-soft">
            {objectives.map((o, i) => (
              <li
                key={`${i}-${o}`}
                className="flex flex-wrap items-start gap-3 py-2.5 text-[16px] text-foreground"
              >
                <span className="min-w-0 flex-1">{o}</span>
                <Edit action={updateObjective}>
                  <input type="hidden" name="session_id" value={s.id} />
                  <input type="hidden" name="index" value={i} />
                  <input
                    name="objective"
                    required
                    defaultValue={o}
                    className={`${field} min-w-[220px] flex-1`}
                  />
                </Edit>
                <form action={moveObjective} className="flex gap-1">
                  <input type="hidden" name="session_id" value={s.id} />
                  <input type="hidden" name="index" value={i} />
                  <button
                    name="direction"
                    value="up"
                    type="submit"
                    disabled={i === 0}
                    aria-label="Monter"
                    className="rounded px-2 py-1 text-muted disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    name="direction"
                    value="down"
                    type="submit"
                    disabled={i === objectives.length - 1}
                    aria-label="Descendre"
                    className="rounded px-2 py-1 text-muted disabled:opacity-25"
                  >
                    ↓
                  </button>
                </form>
                <form action={removeObjective}>
                  <input type="hidden" name="session_id" value={s.id} />
                  <input type="hidden" name="index" value={i} />
                  <button
                    type="submit"
                    aria-label="Retirer cet objectif"
                    className="rounded-md p-1.5 text-muted transition hover:bg-foreground/[0.06] hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form
          action={addObjective}
          className="flex flex-wrap gap-3 sm:flex-nowrap"
        >
          <input type="hidden" name="session_id" value={s.id} />
          <input
            name="objective"
            required
            placeholder="Ajouter un objectif"
            className={`${field} min-w-0 flex-1`}
          />
          <button type="submit" className={soft}>
            Ajouter un objectif
          </button>
        </form>
      </div>
    ),
    video: (
      <form action={updateSession} className="space-y-3">
        {keep}
        <input type="hidden" name="summary" value={s.summary ?? ""} />
        <input type="hidden" name="objectives" value={s.objectives ?? ""} />
        <label className="block text-[15px] text-muted" htmlFor="tp-video">
          URL YouTube, Vimeo ou vidéo externe
        </label>
        <input
          id="tp-video"
          name="video_url"
          type="url"
          defaultValue={s.video_url ?? ""}
          placeholder="https://…"
          className={field}
        />
        <p className="text-sm text-muted">
          La section vidéo reste invisible pour les étudiants tant qu’aucune URL
          n’est renseignée.
        </p>
        <FormSubmitButton className={save} />
      </form>
    ),
    consignes: (
      <div>
        <p className="mb-3 text-[15px] text-muted">
          Ajoutez une lecture, une vidéo, un document ou une réflexion à
          préparer avant la session.
        </p>
        {assignmentList(before)}
        {quickAdd(
          "Titre de l'élément à préparer",
          "Ajouter un élément à préparer",
          "before",
        )}
      </div>
    ),
    supports: (
      <div>
        {materials.length > 0 && (
          <ul className="mb-4 divide-y divide-border-soft">
            {materials.map((m, materialIndex) => (
              <li
                key={m.id}
                className="flex flex-wrap items-start gap-3 py-3 text-[15px]"
              >
                <span className="min-w-0 flex-1">
                  <MaterialLink
                    title={m.title}
                    url={m.link_url ?? m.file_url}
                  />
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {[m.resource_type, visibilityOf(m.visible_at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <form action={moveSupport} className="flex gap-1">
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="session_id" value={s.id} />
                    <button
                      name="direction"
                      value="up"
                      disabled={materialIndex === 0}
                      className="px-1 text-muted disabled:opacity-25"
                    >
                      ↑
                    </button>
                    <button
                      name="direction"
                      value="down"
                      disabled={materialIndex === materials.length - 1}
                      className="px-1 text-muted disabled:opacity-25"
                    >
                      ↓
                    </button>
                  </form>
                  <Remove
                    action={deleteSupport}
                    fields={{ id: m.id, session_id: s.id }}
                  />
                  <Edit action={updateSupport}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="session_id" value={s.id} />
                    <input
                      name="title"
                      required
                      defaultValue={m.title}
                      className={`${field} min-w-[200px] flex-1`}
                    />
                    <input
                      name="description"
                      defaultValue={m.description ?? ""}
                      placeholder="Description"
                      className={`${field} min-w-[220px] flex-1`}
                    />
                    <input
                      name="resource_type"
                      defaultValue={m.resource_type ?? ""}
                      placeholder="Type"
                      className={`${field} min-w-[180px] flex-1`}
                    />
                    {m.link_url !== null && (
                      <input
                        name="link_url"
                        defaultValue={m.link_url ?? ""}
                        placeholder="Lien"
                        className={`${field} min-w-[200px] flex-1`}
                      />
                    )}
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
          Ajoutez ce que les étudiants devront réaliser après la session. Ils le
          retrouvent dans « Travail à faire ».
        </p>
        {assignmentList(after)}
        {quickAdd("Titre du travail", "Ajouter un travail", "after", afterDue)}
      </div>
    ),
  };
}
