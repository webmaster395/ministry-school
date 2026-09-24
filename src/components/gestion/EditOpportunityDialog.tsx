"use client";

import { useActionState, useEffect, useState } from "react";
import { Edit3, X } from "lucide-react";
import { updateOpportunity, type UpdateOpportunityState } from "@/app/gestion/actions";
import { AFTERNOON, longDateLabel } from "@/lib/program-dates";
import { LineList, PersonSearch, PLACES } from "./ProposeDialog";

const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] text-foreground";
const label = "mb-1.5 block text-[14px] text-muted";

export default function EditOpportunityDialog({
  id,
  kind,
  title: initialTitle,
  organizer: initialOrganizer,
  serviceId: initialServiceId,
  description: initialDescription,
  capacity: initialCapacity,
  objectives: rawObjectives,
  prerequisites: rawPrerequisites,
  referent: initialReferent,
  selectedDates: initialSelectedDates,
  initialPlace = "MLK Studio",
  initialRoom = "",
  services,
  dates,
  details,
}: {
  id: string;
  kind: "formation" | "projet";
  title: string;
  organizer: string;
  serviceId?: string | null;
  description: string;
  capacity: number | null;
  objectives?: string | null;
  prerequisites?: string | null;
  referent?: { id: string; full_name: string } | null;
  selectedDates: string[];
  initialPlace?: string;
  initialRoom?: string;
  services: { id: string; name: string }[];
  dates: string[];
  details: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<UpdateOpportunityState, FormData>(updateOpportunity, {});
  const [selected, setSelected] = useState<string[]>(initialSelectedDates);
  const [place, setPlace] = useState<string>(
    PLACES.includes(initialPlace as (typeof PLACES)[number]) ? initialPlace : "Autre"
  );
  const [placeOther, setPlaceOther] = useState(
    PLACES.includes(initialPlace as (typeof PLACES)[number]) ? "" : initialPlace
  );
  const [room, setRoom] = useState(initialRoom);

  const initObjectives = rawObjectives?.split("\n").filter(Boolean) ?? [""];
  const [objectives, setObjectives] = useState<string[]>(initObjectives.length ? initObjectives : [""]);

  const hasPrereq = !!rawPrerequisites?.trim();
  const [none, setNone] = useState(!hasPrereq);
  const initPrereqs = rawPrerequisites?.split("\n").filter(Boolean) ?? [""];
  const [prerequisites, setPrerequisites] = useState<string[]>(initPrereqs.length ? initPrereqs : [""]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ferme la fenêtre après un enregistrement réussi
      setOpen(false);
    }
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-[14px] font-medium text-foreground transition hover:border-foreground"
      >
        <Edit3 size={15} /> Modifier la fiche
      </button>

      {open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
        >
          <form
            action={action}
            role="dialog"
            aria-modal="true"
            aria-label="Modifier la fiche"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[94dvh] w-full max-w-[680px] overflow-y-auto rounded-t-2xl bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:rounded-2xl"
          >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="kind" value={kind} />

            {/* ── En-tête fixe ── */}
            <div className="border-b border-border bg-surface px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="absolute right-4 top-4 rounded-md p-1.5 text-muted transition hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <X size={20} />
              </button>
              <h2 className="font-title text-[22px] leading-tight text-foreground">
                Modifier la fiche {kind === "projet" ? "projet" : "formation"}
              </h2>
              <p className="mt-1.5 text-[14px] text-muted">
                Mettez à jour les informations, objectifs et dates de cette fiche.
              </p>
            </div>

            {/* ── Corps scrollable ── */}
            <div>
              <div className="space-y-5 px-5 py-5 sm:px-7">
                <div>
                  <label className={label} htmlFor="e-title">
                    Titre *
                  </label>
                  <input id="e-title" name="title" defaultValue={initialTitle} required className={field} />
                </div>

                {kind === "projet" ? (
                  <>
                    <div>
                      <label className={label} htmlFor="e-lead">
                        Chef de projet principal *
                      </label>
                      <input id="e-lead" name="organizer_label" defaultValue={initialOrganizer} required className={field} />
                    </div>
                    <PersonSearch
                      name="referent_id"
                      label="Référent du suivi *"
                      defaultValue={initialReferent}
                    />
                  </>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={label} htmlFor="e-lead">
                        Responsable principal *
                      </label>
                      <input id="e-lead" name="organizer_label" defaultValue={initialOrganizer} required className={field} />
                    </div>
                    <div>
                      <label className={label} htmlFor="e-service">
                        Service organisateur *
                      </label>
                      <select id="e-service" name="service_id" required defaultValue={initialServiceId ?? ""} className={field}>
                        <option value="">Choisir un service</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <fieldset className="rounded-xl border border-border p-4">
                  <legend className="px-2 text-[14px] font-semibold text-foreground">Dates *</legend>
                  <div className="mb-3 flex gap-4 text-[14px]">
                    <button
                      type="button"
                      onClick={() => setSelected(dates)}
                      className="text-foreground underline underline-offset-2"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected([])}
                      className="text-foreground underline underline-offset-2"
                    >
                      Effacer la sélection
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {dates.map((d) => (
                      <label
                        key={d}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] text-foreground"
                      >
                        <input
                          type="checkbox"
                          name="date"
                          value={d}
                          checked={selected.includes(d)}
                          onChange={(e) =>
                            setSelected(e.target.checked ? [...selected, d] : selected.filter((x) => x !== d))
                          }
                          className="h-4 w-4"
                        />
                        {longDateLabel(d)}
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-[14px] text-muted">
                    Horaire fixe : <strong className="text-foreground">{AFTERNOON.label}</strong>
                  </p>
                </fieldset>

                <div>
                  <span className={label}>Lieu *</span>
                  <div className="grid grid-cols-3 gap-2">
                    {PLACES.map((p) => (
                      <label
                        key={p}
                        className={`cursor-pointer rounded-lg border py-2.5 text-center text-[15px] transition ${
                          place === p
                            ? "border-foreground bg-accent text-on-accent"
                            : "border-border bg-background text-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name="place"
                          value={p}
                          checked={place === p}
                          onChange={() => setPlace(p)}
                          className="sr-only"
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                  {place === "Autre" && (
                    <input
                      name="place_other"
                      required
                      placeholder="Précisez le lieu"
                      value={placeOther}
                      onChange={(e) => setPlaceOther(e.target.value)}
                      className={`${field} mt-2`}
                    />
                  )}
                </div>

                <div className="sm:max-w-[60%]">
                  <label className={label} htmlFor="e-room">
                    Salle
                  </label>
                  <p className="-mt-1 mb-1.5 text-[12px] text-muted">Facultatif</p>
                  <input
                    id="e-room"
                    name="room"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className={field}
                  />
                </div>

                <div>
                  <label className={label} htmlFor="e-capacity">
                    Capacité maximale *
                  </label>
                  <p className="-mt-1 mb-1.5 text-[12px] text-muted">Nombre maximal d&apos;inscrits</p>
                  <input
                    id="e-capacity"
                    name="capacity"
                    type="number"
                    min={1}
                    defaultValue={initialCapacity ?? ""}
                    required
                    className={field}
                  />
                </div>

                <div>
                  <label className={label} htmlFor="e-desc">
                    Présentation *
                  </label>
                  <p className="-mt-1 mb-1.5 text-[12px] text-muted">
                    Présentez en quelques lignes le contenu, l&apos;intérêt et le déroulement de{" "}
                    {kind === "projet" ? "ce projet" : "cette formation"}.
                  </p>
                  <textarea
                    id="e-desc"
                    name="description"
                    rows={4}
                    defaultValue={initialDescription}
                    required
                    className={field}
                  />
                </div>

                {details && (
                  <div className="space-y-4 border-t border-border pt-5">
                    <div>
                      <span className="mb-2 block text-[15px] font-semibold text-foreground">Objectifs</span>
                      <LineList
                        name="objective"
                        items={objectives}
                        setItems={setObjectives}
                        addLabel="Ajouter un objectif"
                      />
                    </div>
                    <label className="flex items-center gap-2.5 text-[15px] text-foreground">
                      <input
                        type="checkbox"
                        name="no_prerequisite"
                        checked={none}
                        onChange={(e) => setNone(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Aucun prérequis
                    </label>
                    {!none && (
                      <div>
                        <span className="mb-2 block text-[15px] font-semibold text-foreground">Prérequis</span>
                        <LineList
                          name="prerequisite"
                          items={prerequisites}
                          setItems={setPrerequisites}
                          addLabel="Ajouter un prérequis"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer fixe ── */}
            <div className="space-y-3 border-t border-border px-5 py-4 sm:px-7">
              {state.error && (
                <p role="alert" className="rounded-lg border border-m-doctoral/30 bg-m-doctoral/10 px-3 py-2 text-[14px] text-link">
                  {state.error}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-full border border-border bg-background px-5 py-2.5 text-[15px] text-foreground transition hover:border-foreground disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221] disabled:opacity-60"
                >
                  {pending ? "Enregistrement…" : "Enregistrer les modifications"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
