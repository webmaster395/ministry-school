import Link from "next/link";
import LogoutButton from "./LogoutButton";
import AvatarEditor from "./AvatarEditor";

type Field = { label: string; value: string | null | undefined };

export default function ProfileCard({
  fullName,
  email,
  roleLabel,
  fields = [],
  userId,
  avatarUrl = null,
}: {
  fullName: string;
  email: string;
  roleLabel: string;
  fields?: Field[];
  userId?: string;
  avatarUrl?: string | null;
}) {
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <>
      <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
        {/* Sur téléphone, les trois blocs s'empilent : côte à côte, le nom et l'adresse
            débordaient de la carte. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {userId ? (
            <AvatarEditor userId={userId} fullName={fullName} initialUrl={avatarUrl} />
          ) : (
            <div className="font-title flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg text-on-accent">
              {initials || "?"}
            </div>
          )}
          <div className="min-w-0 sm:flex-1">
            <p className="font-title text-2xl leading-tight text-foreground">{fullName}</p>
            <p className="break-all text-sm text-muted">{email}</p>
          </div>
          <span className="label self-start rounded-full border border-border px-3 py-1 text-xs tracking-[0.1em] text-foreground sm:shrink-0 sm:self-auto">
            {roleLabel}
          </span>
        </div>
      </section>

      {fields.length > 0 && (
        <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
          <h2 className="mb-4 label text-xs tracking-[0.18em] text-muted">MES INFORMATIONS</h2>
          <dl className="divide-y divide-border">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center justify-between py-3 text-sm">
                <dt className="text-muted">{f.label}</dt>
                <dd className="font-medium text-foreground">{f.value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
        <h2 className="mb-1 label text-xs tracking-[0.18em] text-muted">SESSION</h2>
        <p className="mb-4 text-sm text-muted">
          Pour modifier vos informations, contactez l&apos;équipe administrative.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <LogoutButton />
          <Link
            href="/mentions-legales#donnees-personnelles"
            className="text-xs text-muted hover:text-foreground hover:underline"
          >
            Politique de confidentialité →
          </Link>
        </div>
      </section>
    </>
  );
}
