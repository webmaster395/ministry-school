"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import MinistryPicto from "@/components/MinistryPicto";
import { MINISTRIES } from "@/lib/ministry";
import type { MinistryProfile } from "@/lib/ministry-content";

export type LabelMinistry = {
  slug: string;
  name: string;
  description: string;
  profile: MinistryProfile | null;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Les cinq étiquettes de sensibilité. Cliquer sur l'une d'elles déplie juste en dessous
 * le bloc qui la présente ; un second clic le referme.
 */
export default function MinistryLabels({ ministries }: { ministries: LabelMinistry[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const current = ministries.find((m) => m.slug === open) ?? null;
  const info = current ? MINISTRIES[current.slug] : null;
  const color = info?.color ?? "var(--border)";

  return (
    <div>
      <ul className="flex flex-wrap gap-2.5">
        {ministries.map((m) => {
          const mi = MINISTRIES[m.slug];
          const active = m.slug === open;
          return (
            <li key={m.slug}>
              <button
                type="button"
                onClick={() => setOpen(active ? null : m.slug)}
                aria-expanded={active}
                className={`label inline-flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-4 text-[11px] tracking-[0.1em] text-foreground transition ${
                  active ? "border-2 border-foreground" : "border border-border hover:border-foreground/40"
                }`}
                style={{ background: `color-mix(in srgb, ${mi?.color} 18%, var(--background))` }}
              >
                <MinistryPicto slug={m.slug} size={16} />
                {mi?.adjective ?? m.name}
              </button>
            </li>
          );
        })}
      </ul>

      {current && (
        <section
          className="mt-4 overflow-hidden rounded-lg border border-border border-t-[3px] bg-background"
          style={{ borderTopColor: color }}
        >
          <div className="grid sm:grid-cols-[1fr_200px]">
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <MinistryPicto slug={current.slug} size={26} />
                  <h4 className="font-title text-[20px] leading-tight text-foreground">
                    {info ? `Ministère ${capitalize(info.adjective)}` : current.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label="Fermer"
                  className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <X size={18} strokeWidth={1.8} />
                </button>
              </div>

              <p className="mt-2 text-[15px] font-medium text-foreground">{current.description}</p>

              {current.profile && (
                <dl className="mt-4 grid gap-4 border-t border-border-soft pt-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border-soft">
                  <Col title="Ce qui vous anime" text={current.profile.anime} first />
                  <Col title="Votre contribution" text={current.profile.contribution} />
                  <Col title="Votre point de vigilance" text={current.profile.vigilance} />
                </dl>
              )}
            </div>

            <div className="hidden p-6 pl-0 sm:block">
              <Image
                src={`/ministeres/${current.slug}-v2.jpg`}
                alt=""
                width={1080}
                height={1080}
                sizes="200px"
                className="aspect-square w-full rounded-lg object-cover"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Col({ title, text, first = false }: { title: string; text: string; first?: boolean }) {
  return (
    <div className={first ? "sm:pr-5" : "sm:px-5"}>
      <dt className="text-[14px] font-semibold text-foreground">{title}</dt>
      <dd className="mt-1.5 text-[14px] leading-relaxed text-muted">{text}</dd>
    </div>
  );
}
