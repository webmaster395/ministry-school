import { createClient } from "@/lib/supabase/server";
import { getAllUsers, getStudents } from "@/lib/data/admin";
import MinistryPicto from "@/components/MinistryPicto";

const roleLabels: Record<string, string> = {
  student: "Étudiant",
  teacher: "Enseignant",
  admin: "Administrateur",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(value));
}

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const [users, students] = await Promise.all([getAllUsers(supabase), getStudents(supabase)]);

  const pending = students.filter((s) => !s.email_confirmed);
  const staff = users.filter((u) => u.role !== "student");

  return (
    <>
      <section className="rounded-lg border border-border bg-background p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="label text-xs tracking-[0.18em] text-muted">ÉTUDIANTS INSCRITS</h2>
            <p className="mt-1 text-sm text-muted">
              {students.length} inscription{students.length > 1 ? "s" : ""} au total.
            </p>
          </div>
          <a
            href="/admin/utilisateurs/export"
            className="label rounded-md border border-foreground px-4 py-2.5 text-xs tracking-[0.12em] text-foreground transition hover:bg-foreground/[0.04]"
          >
            Télécharger (CSV)
          </a>
        </div>

        {students.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="label border-b border-border text-[11px] tracking-[0.16em] text-muted">
                  <th className="py-3 pr-4">Nom</th>
                  <th className="py-3 pr-4">Ministère</th>
                  <th className="py-3 pr-4">Jour</th>
                  <th className="py-3 pr-4">Statut</th>
                  <th className="py-3">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3.5 pr-4 text-foreground">{s.full_name}</td>
                    <td className="py-3.5 pr-4 text-sm text-foreground">
                      <span className="flex items-center gap-2">
                        <MinistryPicto slug={s.ministries?.slug} size={16} />
                        {s.ministries?.name ?? <span className="text-muted">—</span>}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 capitalize text-muted">{s.preferred_day ?? "—"}</td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`label rounded-full px-2.5 py-0.5 text-[10px] tracking-[0.12em] ${
                          s.email_confirmed
                            ? "border border-border text-muted"
                            : "border border-m-doctoral/40 bg-m-doctoral/[0.08] text-link"
                        }`}
                      >
                        {s.email_confirmed ? "Finalisée" : "À confirmer"}
                      </span>
                    </td>
                    <td className="py-3.5 tabular-nums text-muted">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Aucun étudiant inscrit pour le moment.</p>
        )}
      </section>

      {pending.length > 0 && (
        <section className="rounded-lg border border-m-doctoral/35 bg-m-doctoral/[0.05] p-6">
          <h2 className="label mb-1 text-xs tracking-[0.18em] text-link">
            INSCRIPTIONS À FINALISER
          </h2>
          <p className="mb-4 text-sm text-muted">
            Ces personnes ont créé un compte mais n&apos;ont pas encore validé leur adresse
            e-mail. Elles ne recevront pas les informations tant que ce n&apos;est pas fait.
          </p>
          <ul className="divide-y divide-border">
            {pending.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">{s.full_name}</span>
                <span className="text-muted">inscrit le {formatDate(s.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 label text-xs tracking-[0.18em] text-muted">ÉQUIPE</h2>
        <ul className="divide-y divide-border">
          {staff.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-foreground">{u.full_name}</span>
              <span className="flex items-center gap-2 text-muted">
                {u.ministries?.name && <span>{u.ministries.name}</span>}
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                  {roleLabels[u.role] ?? u.role}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
