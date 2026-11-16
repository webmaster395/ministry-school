import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { invitationSummary } from "@/lib/mapp/invitations";
import { guestOwnsAttempt } from "@/lib/mapp/guest";
import GuestInvitationForm from "./GuestInvitationForm";
import GuestRecoveryForm from "./GuestRecoveryForm";

export const dynamic = "force-dynamic";
export default async function MappInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await invitationSummary(token);
  if (!invitation) notFound();
  if (!invitation.available && invitation.attemptId && await guestOwnsAttempt(invitation.attemptId)) {
    redirect(invitation.attemptStatus === "completed"
      ? `/apps/profil-mapp/test/${invitation.attemptId}/resultat`
      : `/apps/profil-mapp/test/${invitation.attemptId}?invitation=1`);
  }
  return <main className="min-h-dvh bg-[#f7f4ef] px-4 py-10 text-[#252d2c] sm:py-16"><section className="mx-auto max-w-2xl rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(34,37,36,.08)] sm:p-10">
    <p className="text-xs font-bold tracking-[.2em] text-[#7b4b78]">PROFIL MAPP</p>
    <h1 className="mt-4 font-title text-4xl leading-tight sm:text-5xl">{invitation.inviterFirstName} vous invite à découvrir votre profil MAPP</h1>
    <p className="mt-4 text-lg text-black/60">Profil MAPP — Ministry School par MLK Formation.</p>
    <Link href="https://www.ministryschool.fr" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">Découvrir Ministry School</Link>
    {invitation.available ? <GuestInvitationForm token={token} /> : <div className="mt-8 rounded-2xl bg-[#f7f4ef] p-6"><h2 className="font-title text-2xl">Invitation déjà commencée</h2><p className="mt-2 text-black/60">Ce lien est personnel. Sur l’appareil utilisé pour commencer, ton parcours reprend automatiquement. Si tu as changé d’appareil après avoir reçu ton code d’accès, utilise-le ci-dessous.</p><GuestRecoveryForm token={token} /></div>}
  </section></main>;
}
