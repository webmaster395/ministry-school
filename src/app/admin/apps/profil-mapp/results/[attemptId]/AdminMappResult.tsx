"use client";

import Link from "next/link";
import { ResultPanel } from "@/app/apps/profil-mapp/MappNativeExperience";
import { unresolvedTie } from "@/app/apps/profil-mapp/MappTieBreakExperience";
import type { MappResultBundle } from "@/lib/mapp/types";

export default function AdminMappResult({ bundle }: { bundle: MappResultBundle }) {
  if (unresolvedTie(bundle)) {
    return <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-950">
      <h1 className="font-title text-3xl">Départage attendu</h1>
      <p className="mt-3 leading-7">Les réponses initiales sont conservées. Cette personne doit répondre elle-même aux trois situations de départage depuis son espace afin d’obtenir son classement officiel.</p>
      <Link href="/admin/apps/profil-mapp/results" className="mt-6 inline-block font-semibold underline underline-offset-4">Retour aux résultats</Link>
    </div>;
  }
  return <ResultPanel bundle={bundle} canInvite={false} />;
}
