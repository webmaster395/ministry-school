"use client";

import { Trash2 } from "lucide-react";
import { deleteUserList } from "@/app/gestion/admin/list-actions";

export default function DeleteUserListForm({ id, name, resourceCount }: { id: string; name: string; resourceCount: number }) {
  const consequence = resourceCount
    ? ` Elle sera retirée de ${resourceCount} ressource${resourceCount > 1 ? "s" : ""}. Les autres listes et accès individuels seront conservés.`
    : " Ses membres ne seront pas supprimés de Ministry School.";
  return <form action={deleteUserList} onSubmit={(event) => { if (!window.confirm(`Supprimer la liste « ${name} » ?${consequence}`)) event.preventDefault(); }}>
    <input type="hidden" name="list_id" value={id} />
    <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-red-200 px-4 text-xs font-semibold text-red-800"><Trash2 size={14} /> Supprimer la liste</button>
  </form>;
}

