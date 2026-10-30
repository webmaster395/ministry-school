"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveMemberRoleComment, type MemberActionResult } from "@/app/gestion/admin/actions";

export default function RoleCommentForm({ userId, initialComment }: { userId: string; initialComment: string }) {
  const [comment, setComment] = useState(initialComment);
  const [state, action, pending] = useActionState<MemberActionResult, FormData>(saveMemberRoleComment, {});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!state.success) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- confirmation temporaire après l'action serveur
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <form action={action} className="mt-4 border-t border-border-soft pt-4">
      <input type="hidden" name="user_id" value={userId} />
      <label className="block text-xs font-semibold text-foreground" htmlFor={`role-comment-${userId}`}>Commentaire interne</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          id={`role-comment-${userId}`}
          name="comment"
          value={comment}
          onChange={(event) => { setComment(event.target.value); setSaved(false); }}
          maxLength={2000}
          rows={2}
          placeholder="Ajouter une information utile à l’équipe administrative…"
          className="min-h-20 flex-1 resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
        <button type="submit" disabled={pending} className="label inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-4 text-[11px] tracking-[0.1em] text-foreground transition hover:border-foreground/40 disabled:opacity-60">
          {pending ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {pending ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
