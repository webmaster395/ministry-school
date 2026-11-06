"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { archiveAllMappResults } from "@/app/admin/apps/profil-mapp/results/actions";

export default function MappResultsDangerZone({ count }: { count: number }) {
  const [confirmation, setConfirmation] = useState("");
  const ready = count > 0 && confirmation === "SUPPRIMER";

  return <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 sm:p-7">
    <h2 className="font-title text-2xl font-normal text-red-900">Supprimer tous les résultats</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-red-950/75">
      Cette action retirera les {count} passage{count > 1 ? "s" : ""} Profil MAPP de l’administration et des statistiques. Les questionnaires publiés et les textes de restitution ne seront pas modifiés.
    </p>
    <form
      action={archiveAllMappResults}
      className="mt-5 grid max-w-xl gap-3"
      onSubmit={(event) => {
        if (!ready || !window.confirm(`Supprimer les ${count} résultats Profil MAPP ?`)) event.preventDefault();
      }}
    >
      <label className="grid gap-2 text-xs font-semibold text-red-950">
        Écris SUPPRIMER pour confirmer
        <input
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="min-h-11 rounded-xl border border-red-200 bg-white px-3 text-sm font-normal outline-none focus:border-red-500"
          placeholder="SUPPRIMER"
        />
      </label>
      <button
        type="submit"
        disabled={!ready}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-red-700 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 size={16} /> Supprimer tous les résultats
      </button>
    </form>
  </section>;
}
