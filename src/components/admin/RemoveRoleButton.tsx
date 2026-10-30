"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { removeMemberRole, type MemberActionResult } from "@/app/gestion/admin/actions";

export default function RemoveRoleButton({ userId, roleKey, scopeId, label }: { userId: string; roleKey: string; scopeId: string | null; label: string }) {
  const [state, action, pending] = useActionState<MemberActionResult, FormData>(removeMemberRole, {});
  return <form action={action} onSubmit={(event) => { if (!window.confirm(`Retirer le rôle « ${label} » ? Les autres rôles seront conservés.`)) event.preventDefault(); }} className="inline-flex items-center gap-1.5">
    <input type="hidden" name="user_id" value={userId} />
    <input type="hidden" name="role_key" value={roleKey} />
    <input type="hidden" name="scope_id" value={scopeId ?? ""} />
    <button type="submit" disabled={pending} className="inline-flex items-center gap-1 text-[11px] font-medium text-link hover:underline disabled:opacity-50">{pending && <Loader2 size={11} className="animate-spin" />}Retirer</button>
    {state.error && <span role="alert" className="max-w-44 text-[10px] text-red-700">{state.error}</span>}
  </form>;
}
