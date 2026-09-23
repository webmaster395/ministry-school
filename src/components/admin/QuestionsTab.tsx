import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QUESTION_CATEGORIES, type QuestionCategory } from "@/lib/questions";
import { setQuestionHandled } from "@/app/gestion/admin/actions";

const fmt = (d: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(
    new Date(d)
  );

export default async function QuestionsTab({ filter }: { filter: string }) {
  const supabase = await createClient();
  const active = filter === "traitees" ? "traitees" : "a_traiter";

  const [{ data: rows }, { data: profiles }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, user_id, category, subject, body, status, created_at")
      .eq("status", active === "traitees" ? "traitee" : "nouvelle")
      .order("created_at", { ascending: active === "traitees" ? false : true }),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const nameOf = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));

  return (
    <div className="space-y-5">
      <nav className="inline-flex gap-1 rounded-lg border border-border bg-background p-1">
        {[
          { key: "a_traiter", label: "À traiter" },
          { key: "traitees", label: "Traitées" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/gestion/admin?onglet=questions&filtre=${t.key}`}
            className={`rounded-md px-4 py-2 text-sm transition ${
              active === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {(rows ?? []).length ? (
        <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
          {(rows ?? []).map((q) => {
            const c = QUESTION_CATEGORIES[q.category as QuestionCategory];
            return (
              <li key={q.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="label rounded-full bg-surface px-3 py-1 text-[10px] tracking-[0.1em] text-foreground">
                    {c?.label} · à transmettre à {c?.handler}
                  </span>
                  <span className="text-xs text-muted">
                    {nameOf.get(q.user_id) ?? "Inconnu"} · {fmt(q.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-[16px] font-semibold text-foreground">{q.subject}</p>
                <p className="mt-1 whitespace-pre-line text-[15px] text-muted">{q.body}</p>
                <form action={setQuestionHandled} className="mt-3">
                  <input type="hidden" name="question_id" value={q.id} />
                  <input type="hidden" name="handled" value={q.status === "nouvelle" ? "1" : "0"} />
                  <button type="submit" className="text-sm font-medium text-foreground underline underline-offset-2">
                    {q.status === "nouvelle" ? "Marquer comme traitée" : "Remettre à traiter"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">
            {active === "a_traiter" ? "Aucune question en attente." : "Aucune question traitée pour le moment."}
          </p>
        </section>
      )}
    </div>
  );
}
