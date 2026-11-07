import { redirect } from "next/navigation";

export default async function StudentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string }>;
}) {
  const { jour } = await searchParams;
  const month = jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour.slice(0, 7) : null;
  redirect(month ? `/etudiant/cours?mois=${month}` : "/etudiant/cours");
}
