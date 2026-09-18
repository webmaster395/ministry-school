import { createClient } from "@/lib/supabase/server";
import { getEnrollmentBreakdown, getGlobalStats } from "@/lib/data/admin";
import BarChart from "@/components/BarChart";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [stats, breakdown] = await Promise.all([
    getGlobalStats(supabase),
    getEnrollmentBreakdown(supabase),
  ]);

  const cards = [
    { label: "Étudiants inscrits", value: stats.studentCount, hero: true, pending: false },
    { label: "Inscriptions finalisées", value: stats.confirmedCount, pending: false },
    { label: "En attente de confirmation", value: stats.pendingCount, pending: true },
    { label: "Enseignants", value: stats.teacherCount, pending: false },
    { label: "Séances programmées", value: stats.sessionCount, pending: false },
    { label: "Supports publiés", value: stats.materialCount, pending: false },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg border border-border bg-background p-6 ${
              c.pending ? "border-l-4 border-l-m-doctoral" : ""
            }`}
          >
            <p
              className={`label text-[11px] tracking-[0.18em] ${
                c.pending ? "text-link" : "text-muted"
              }`}
            >
              {c.label}
            </p>
            <p
              className={`font-title mt-3 leading-none text-foreground ${
                c.hero ? "text-[56px]" : "text-4xl"
              }`}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <BarChart
        title="Inscrits par ministère"
        subtitle="Nombre d'étudiants ayant choisi chaque ministère."
        data={breakdown.byMinistry.map((m) => ({ label: m.name, value: m.count, slug: m.slug }))}
      />

      <BarChart
        title="Répartition par jour"
        subtitle="Jour de cours choisi par les étudiants."
        data={breakdown.byDay.map((d) => ({ label: d.day, value: d.count }))}
      />
    </>
  );
}
