import { LogoLockup } from "@/components/Logo";
import { confirmEmail } from "./actions";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface p-4 sm:p-6">
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex justify-center bg-foreground px-8 py-8">
          <div className="w-full max-w-[240px]">
            <LogoLockup priority />
          </div>
        </div>

        <div className="p-8 text-center">
          <h1 className="font-title text-[26px] leading-tight text-foreground">
            Confirmer mon inscription
          </h1>

          {token_hash ? (
            <>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Une dernière étape : cliquez sur le bouton pour activer votre compte Ministry School.
              </p>
              <form action={confirmEmail} className="mt-6">
                <input type="hidden" name="token_hash" value={token_hash} />
                <input type="hidden" name="type" value={type ?? "email"} />
                <button
                  type="submit"
                  className="label w-full rounded-lg bg-foreground px-5 py-3.5 text-sm tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221]"
                >
                  Activer mon compte
                </button>
              </form>
            </>
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Ce lien est incomplet. Ouvrez-le depuis l&apos;e-mail que nous vous avons envoyé, ou{" "}
              <a href="/login" className="text-link underline">
                connectez-vous
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
