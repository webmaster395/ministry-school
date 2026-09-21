import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isPlainStudent } from "@/lib/data/viewer";
import { QUESTION_CATEGORIES, type QuestionCategory } from "@/lib/questions";
import { askQuestion } from "./actions";

const field = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-[15px] text-foreground";

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ envoye?: string }> }) {
  const { envoye } = await searchParams;

  // Les questions sont réservées aux étudiants : les autres profils n'en ont pas besoin
  const viewer = await getViewer();
  if (!viewer || !isPlainStudent(viewer.roles)) redirect("/etudiant");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mine } = await supabase
    .from("questions")
    .select("id, category, subject, status, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-border bg-background p-6 sm:p-7">
        <h2 className="font-title text-[24px] leading-tight text-foreground">Une question ?</h2>
        <p className="mt-1 text-[15px] text-muted">
          Écrivez-nous : votre message est transmis à la personne qui peut vous répondre.
        </p>

        {envoye && (
          <p className="mt-4 rounded-md bg-surface px-4 py-3 text-[15px] text-foreground">
            Merci, votre question est bien partie. Nous revenons vers vous rapidement.
          </p>
        )}

        <form action={askQuestion} className="mt-5 space-y-4">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm text-muted">Sujet de votre question</legend>
            {(Object.entries(QUESTION_CATEGORIES) as [QuestionCategory, (typeof QUESTION_CATEGORIES)[QuestionCategory]][]).map(
              ([key, c], i) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3.5 has-[:checked]:border-foreground has-[:checked]:bg-surface"
                >
                  <input type="radio" name="category" value={key} defaultChecked={i === 0} className="mt-1" />
                  <span>
                    <span className="block text-[15px] font-semibold text-foreground">{c.label}</span>
                    <span className="block text-sm text-muted">{c.hint}</span>
                  </span>
                </label>
              )
            )}
          </fieldset>

          <div>
            <label className="mb-1 block text-sm text-muted">Objet</label>
            <input name="subject" required maxLength={160} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Votre question</label>
            <textarea name="body" required rows={6} maxLength={4000} className={field} />
          </div>

          <button
            type="submit"
            className="label rounded-full bg-accent px-7 py-3.5 text-xs tracking-[0.12em] text-on-accent hover:bg-[#1b2221]"
          >
            Envoyer ma question
          </button>
        </form>
      </section>

      <aside className="rounded-lg border border-border bg-background p-6">
        <h3 className="font-title text-[22px] text-foreground">Mes questions</h3>
        {(mine ?? []).length ? (
          <ul className="mt-3 divide-y divide-border-soft">
            {(mine ?? []).map((q) => (
              <li key={q.id} className="py-3">
                <p className="text-[15px] font-medium text-foreground">{q.subject}</p>
                <p className="text-xs text-muted">
                  {QUESTION_CATEGORIES[q.category as QuestionCategory]?.label} ·{" "}
                  {q.status === "traitee" ? "Traitée" : "En attente"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Vous n&apos;avez pas encore posé de question.</p>
        )}
      </aside>
    </div>
  );
}
