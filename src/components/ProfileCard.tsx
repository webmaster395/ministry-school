import Link from "next/link";
import LogoutButton from "./LogoutButton";
import AvatarEditor from "./AvatarEditor";
import { updateProfileDetails } from "@/app/etudiant/profil/actions";

type Field = { label: string; value: string | null | undefined };

export default function ProfileCard({
  fullName,
  email,
  roleLabel,
  phone = "",
  ministryName,
  fields = [],
  userId,
  avatarUrl = null,
}: {
  fullName: string;
  email: string;
  roleLabel: string;
  phone?: string;
  ministryName?: string | null;
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
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const lastName = nameParts.length > 1 ? nameParts.at(-1) ?? "" : "";
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : (nameParts[0] ?? "");
  const inputClass =
    "mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none transition focus:border-foreground disabled:bg-surface disabled:text-muted";

  return (
    <>
      <section className="rounded-lg border border-border bg-background p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {userId ? (
            <AvatarEditor userId={userId} fullName={fullName} initialUrl={avatarUrl} />
          ) : (
            <div className="font-title flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg text-on-accent">
              {initials || "?"}
            </div>
          )}
          <div className="min-w-0 sm:ml-auto sm:flex-1">
            <p className="font-title text-[26px] font-semibold leading-tight text-foreground">{fullName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {roleLabel.split(" · ").map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-foreground"
                >
                  {role}
                </span>
              ))}
            </div>
            <p className="mt-2 break-all text-sm text-muted">{email}</p>
          </div>
        </div>

        <form action={updateProfileDetails} className="mt-7 border-t border-border pt-6">
          <h2 className="label text-xs tracking-[0.18em] text-muted">MES INFORMATIONS</h2>
          <div className="mt-4 grid gap-x-6 gap-y-5 md:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Prénom
              <input className={inputClass} name="first_name" defaultValue={firstName} required maxLength={80} />
            </label>
            <label className="text-sm font-medium text-foreground">
              Nom
              <input className={inputClass} name="last_name" defaultValue={lastName} required maxLength={80} />
            </label>
            <label className="text-sm font-medium text-foreground">
              Téléphone
              <input
                className={inputClass}
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={phone}
                placeholder="Votre numéro de téléphone"
                maxLength={30}
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Adresse e-mail
              <input className={inputClass} value={email} type="email" disabled />
              <span className="mt-1.5 block text-xs font-normal text-muted">
                Contactez l’administration pour modifier cette adresse.
              </span>
            </label>
            <label className="text-sm font-medium text-foreground md:col-span-2">
              Ministère
              <input
                className={inputClass}
                value={ministryName || "Non renseigné"}
                disabled
                aria-describedby="ministry-help"
              />
              <span id="ministry-help" className="mt-1.5 block text-xs font-normal text-muted">
                Cette information est synchronisée avec la sensibilité ministérielle renseignée sur la plateforme.
              </span>
            </label>
          </div>
          <button
            type="submit"
            className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition hover:bg-[#1b2221]"
          >
            Enregistrer les modifications
          </button>
        </form>
      </section>

      {fields.length > 0 && (
        <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
          <dl className="divide-y divide-border">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-4 py-3 text-sm">
                <dt className="text-muted">{f.label}</dt>
                <dd className="text-right font-medium text-foreground">{f.value ?? "—"}</dd>
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
