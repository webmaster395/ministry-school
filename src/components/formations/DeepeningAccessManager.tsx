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

      <label className="mt-5 flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm text-muted focus-within:border-foreground">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un étudiant" className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted" />
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
