"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveMlkEngagement, type EngagementState } from "@/app/etudiant/actions";
import type { MlkEngagement } from "@/lib/mlk-engagement";

export default function MlkEngagementForm({
  initial,
  onSaved,
}: {
  initial: MlkEngagement;
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState<EngagementState, FormData>(saveMlkEngagement, {});
  const [status, setStatus] = useState(initial.manager ? "manager" : initial.collaborator ? "collaborator" : initial.equipier ? "equipier" : initial.none ? "none" : "");

  useEffect(() => {
    if (state.success) onSaved?.();
  }, [onSaved, state.success]);

  const option = "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition";

  return (
    <form action={action} className="space-y-4">
      <div>
        <h3 className="font-title text-[21px] leading-tight text-foreground">Quelle est ta situation à MLK&nbsp;?</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">Sélectionne le statut qui correspond à ta situation.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className={`${option} ${status === "none" ? "border-foreground bg-accent/15" : "border-border bg-background"}`}>
          <input type="radio" name="status" value="none" checked={status === "none"} onChange={() => setStatus("none")} className="h-4 w-4 accent-[#27302f]" />
          <span className="text-sm font-medium text-foreground">Aucun engagement actuellement</span>
        </label>
        <label className={`${option} ${status === "equipier" ? "border-foreground bg-accent/15" : "border-border bg-background"}`}>
          <input type="radio" name="status" value="equipier" checked={status === "equipier"} onChange={() => setStatus("equipier")} className="h-4 w-4 accent-[#27302f]" />
          <span className="text-sm font-medium text-foreground">Équipier MLK</span>
        </label>
        <label className={`${option} ${status === "manager" ? "border-foreground bg-accent/15" : "border-border bg-background"}`}>
          <input type="radio" name="status" value="manager" checked={status === "manager"} onChange={() => setStatus("manager")} className="h-4 w-4 accent-[#27302f]" />
          <span className="text-sm font-medium text-foreground">Manager ou manager adjoint MLK</span>
        </label>
        <label className={`${option} ${status === "collaborator" ? "border-foreground bg-accent/15" : "border-border bg-background"}`}>
          <input type="radio" name="status" value="collaborator" checked={status === "collaborator"} onChange={() => setStatus("collaborator")} className="h-4 w-4 accent-[#27302f]" />
          <span className="text-sm font-medium text-foreground">Collaborateur salarié MLK</span>
        </label>
      </div>

      {(status === "equipier" || status === "manager") && (
        <div className="grid gap-3 sm:grid-cols-2">
          {status === "equipier" && <ServiceField title="Dans quel(s) service(s) es-tu équipier ?" name="equipier_services" defaultValue={initial.equipierServices} />}
          {status === "manager" && <ServiceField title="De quel(s) service(s) es-tu manager ou manager adjoint ?" name="manager_services" defaultValue={initial.managerServices} />}
        </div>
      )}

      {state.error && <p role="alert" className="text-sm text-link">{state.error}</p>}
      <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent transition hover:bg-[#1b2221] disabled:opacity-70">
        {pending ? <Loader2 size={16} className="animate-spin" /> : state.success ? <Check size={16} /> : null}
        {pending ? "Enregistrement…" : state.success ? "Enregistré" : "Valider mes informations"}
      </button>
    </form>
  );
}

function ServiceField({ title, name, defaultValue }: { title: string; name: string; defaultValue: string }) {
  return (
    <label className="block rounded-xl bg-surface p-3.5">
      <span className="text-[13px] font-semibold text-foreground">{title}</span>
      <input name={name} type="text" required defaultValue={defaultValue} placeholder="Écris le nom du ou des services" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-foreground" />
      <span className="mt-1.5 block text-xs text-muted">Tu peux séparer plusieurs services par une virgule.</span>
    </label>
  );
}
