import { redirect } from "next/navigation";

export default async function OfficialTieBreakPage({ params, searchParams }: { params: Promise<{ attemptId: string }>; searchParams: Promise<{ revision?: string }> }) {
  const [{ attemptId }, query] = await Promise.all([params, searchParams]);
  const suffix = query.revision ? `?revision=${query.revision}&native=1` : "?native=1";
  redirect(`/apps/profil-mapp/test/${attemptId}/resultat${suffix}`);
}
