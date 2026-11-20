"use client";

import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from "lucide-react";
import type { ProgramSlot } from "@/lib/preparation/program";

export default function SlotEditor({
  slot,
  index,
  count,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
  onDragStart,
  onDrop,
}: {
  slot: ProgramSlot;
  index: number;
  count: number;
  onChange: (patch: Partial<ProgramSlot>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const fieldClass = "min-h-10 w-full rounded-lg border border-border px-3 py-2 text-sm";
  const isPause = slot.type === "pause";
  return <article draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDrop(); }} className="rounded-xl border border-border bg-background p-3 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted"><GripVertical size={17} aria-hidden="true" /> Créneau {index + 1}</div>
      <div className="flex items-center gap-0.5">
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Monter le créneau" className="rounded-md p-2 text-muted hover:bg-surface disabled:opacity-30"><ArrowUp size={15} /></button>
        <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Descendre le créneau" className="rounded-md p-2 text-muted hover:bg-surface disabled:opacity-30"><ArrowDown size={15} /></button>
        <button type="button" onClick={onDuplicate} aria-label="Dupliquer le créneau" className="rounded-md p-2 text-muted hover:bg-surface"><Copy size={15} /></button>
        <button type="button" onClick={onDelete} aria-label="Supprimer le créneau" className="rounded-md p-2 text-[#a13b30] hover:bg-red-50"><Trash2 size={15} /></button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-xs font-medium text-muted">Début<input type="time" value={slot.start} onChange={(event) => onChange({ start: event.target.value })} className={`${fieldClass} mt-1`} /></label>
      <label className="text-xs font-medium text-muted">Fin <span className="font-normal">(facultatif)</span><input type="time" value={slot.end} onChange={(event) => onChange({ end: event.target.value })} className={`${fieldClass} mt-1`} /></label>
      <label className="col-span-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-3 text-sm font-semibold"><input type="checkbox" checked={isPause} onChange={(event) => onChange(event.target.checked ? { type: "pause", title: "Pause", description: "" } : { type: "formation", title: slot.title === "Pause" ? "" : slot.title })} className="h-4 w-4 accent-[#27302f]" /> Ce créneau est une pause</label>
      {!isPause ? <>
        <label className="col-span-2 text-xs font-medium text-muted">Titre<input value={slot.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="Titre du créneau" className={`${fieldClass} mt-1`} /></label>
        <label className="col-span-2 text-xs font-medium text-muted">Description <span className="font-normal">(2 lignes maximum)</span><textarea value={slot.description} maxLength={220} onChange={(event) => onChange({ description: event.target.value })} rows={2} className={`${fieldClass} mt-1 resize-none`} /></label>
      </> : null}
    </div>
  </article>;
}
