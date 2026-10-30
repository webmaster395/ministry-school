"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import AdminSelect from "@/components/admin/AdminSelect";
import { assignMemberRole, type MemberActionResult } from "@/app/gestion/admin/actions";

type Choice = { id: string; label: string };

const roleOptions = [
  { value: "super_admin", label: "Super admin" },
  { value: "admin", label: "Admin" },
  { value: "ministry_manager", label: "Responsable ministériel" },
  { value: "ministry_contributor", label: "Contributeur ministériel" },
  { value: "projects_creator", label: "Responsable Projets et formations" },
  { value: "project_manager", label: "Responsable d’une initiative" },
  { value: "project_contributor", label: "Contributeur d’une initiative" },
];

export default function RoleAssignmentForm({ members, ministries, opportunities }: { members: Choice[]; ministries: Choice[]; opportunities: Choice[] }) {
  const [role, setRole] = useState("");
  const [state, action, pending] = useActionState<MemberActionResult, FormData>(assignMemberRole, {});
  const [saved, setSaved] = useState(false);
  const ministryScope = role === "ministry_manager" || role === "ministry_contributor";
  const projectScope = role === "project_manager" || role === "project_contributor";
  const contributor = role === "ministry_contributor" || role === "project_contributor";
  useEffect(() => {
    if (!state.success) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- confirmation après action serveur
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  return <section className="rounded-xl border border-border bg-background p-4 sm:p-6">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface"><Plus size={18} /></span><div><h2 className="font-title text-[22px] text-foreground">Attribuer un rôle</h2><p className="mt-1 text-sm text-muted">Sélectionnez un membre, son niveau de responsabilité et son périmètre éventuel.</p></div></div>
    <form action={action} className="mt-5 grid gap-3 lg:grid-cols-3">
      <AdminSelect name="user_id" placeholder="Rechercher un membre…" options={members.map((item) => ({ value: item.id, label: item.label }))} searchable />
      <AdminSelect name="role_key" value={role} onValueChange={setRole} placeholder="Choisir un rôle…" options={roleOptions} />
      {ministryScope ? <AdminSelect name="scope_id" placeholder="Choisir une sensibilité…" options={ministries.map((item) => ({ value: item.id, label: item.label }))} searchable /> : projectScope ? <AdminSelect name="scope_id" placeholder="Choisir un projet ou une formation…" options={opportunities.map((item) => ({ value: item.id, label: item.label }))} searchable /> : <input type="hidden" name="scope_id" value="" />}
      {contributor && <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3.5 text-sm text-foreground lg:col-span-2"><input type="checkbox" name="can_edit" /> Peut modifier les contenus autorisés</label>}
      <div className={contributor ? "lg:col-span-1" : "lg:col-span-3"}><button type="submit" disabled={pending || !role} className="label inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-xs tracking-[0.12em] text-on-accent disabled:opacity-50">{pending ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Plus size={14} />}{pending ? "Attribution…" : saved ? "Rôle attribué" : "Attribuer le rôle"}</button></div>
      {state.error && <p className="text-sm text-red-700 lg:col-span-3">{state.error}</p>}
    </form>
  </section>;
}
