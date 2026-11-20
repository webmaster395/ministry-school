"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { setDeepeningAuthorization } from "@/app/gestion/formations/actions";

type Student = { id: string; full_name: string; authorized: boolean };

export default function DeepeningAccessManager({ students }: { students: Student[] }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("fr");
  const shown = useMemo(
    () => students.filter((student) => !normalized || student.full_name.toLocaleLowerCase("fr").includes(normalized)),
    [students, normalized],
  );
  const authorized = students.filter((student) => student.authorized).length;

  return (
    <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="label text-[10px] tracking-[0.15em] text-muted">ÉTAPE 1 · AUTORISATION GÉNÉRALE</p>
          <h2 className="font-title mt-2 text-[25px] leading-tight text-foreground">Qui peut accéder aux approfondissements ?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Autorisez ici les étudiants concernés. Ensuite, ouvrez un approfondissement pour les inscrire à cette formation précise.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl bg-surface px-4 py-3">
          <UserRoundCheck size={20} className="text-muted" />
          <span><strong className="block text-lg tabular-nums text-foreground">{authorized}</strong><span className="text-xs text-muted">étudiant{authorized > 1 ? "s" : ""} autorisé{authorized > 1 ? "s" : ""}</span></span>
        </div>
      </div>

      <label className="mt-5 flex min-h-12 w-full max-w-xl items-center gap-3 rounded-2xl border border-border-soft bg-surface/80 p-1.5 pr-4 text-sm text-muted shadow-[0_8px_28px_rgba(28,35,32,.06)] transition focus-within:border-foreground/40 focus-within:bg-background focus-within:shadow-[0_12px_34px_rgba(28,35,32,.1)]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background text-foreground shadow-sm"><Search size={16} strokeWidth={1.8} /></span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par nom" className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-sm text-foreground outline-none ring-0 placeholder:text-muted focus:border-0 focus:outline-none focus:ring-0" />
        {query && <button type="button" onClick={() => setQuery("")} className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-background hover:text-foreground">Effacer</button>}
      </label>

      <div className="mt-3 max-h-[360px] divide-y divide-border-soft overflow-y-auto rounded-xl border border-border">
        {shown.map((student) => (
          <form action={setDeepeningAuthorization} key={student.id} className="flex items-center justify-between gap-3 bg-background px-3.5 py-3 sm:px-4">
            <input type="hidden" name="user_id" value={student.id} />
            <input type="hidden" name="enabled" value={student.authorized ? "0" : "1"} />
            <span className="flex min-w-0 items-center gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${student.authorized ? "bg-emerald-100 text-emerald-800" : "bg-surface text-muted"}`}>
                {student.authorized ? <CheckCircle2 size={17} /> : <ShieldCheck size={16} />}
              </span>
              <strong className="truncate text-sm text-foreground">{student.full_name || "Étudiant sans nom"}</strong>
            </span>
            <button className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${student.authorized ? "bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800" : "bg-accent text-on-accent"}`}>
              {student.authorized ? "Autorisé · retirer" : "Autoriser"}
            </button>
          </form>
        ))}
        {!shown.length && <p className="px-4 py-8 text-center text-sm text-muted">Aucun étudiant ne correspond à cette recherche.</p>}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted"><strong className="text-foreground">Étape 2 :</strong> l’autorisation ne crée aucune inscription. L’inscription se fait ensuite dans la fiche de chaque approfondissement.</p>
    </section>
  );
}
