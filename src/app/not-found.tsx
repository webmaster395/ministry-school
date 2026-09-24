import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-muted">
        <AlertCircle size={32} />
      </div>
      <h1 className="font-title mt-6 text-[32px] font-bold text-foreground">
        Page introuvable
      </h1>
      <p className="mt-2 max-w-md text-[15px] text-muted">
        La page ou la ressource que vous recherchez n&apos;existe pas, a été déplacée ou supprimée.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/etudiant"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-xs font-semibold tracking-wider text-on-accent transition hover:bg-[#1b2221]"
        >
          <ArrowLeft size={16} /> Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
