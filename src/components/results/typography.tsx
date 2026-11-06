import { createElement, type HTMLAttributes, type ReactNode } from "react";

type TypographyProps = HTMLAttributes<HTMLElement> & { as?: "h1" | "h2" | "h3" | "h4" | "p" | "span"; children: ReactNode };

function role(defaultTag: NonNullable<TypographyProps["as"]>, roleClass: string) {
  return function Typography({ as, className, children, ...props }: TypographyProps) {
    return createElement(as ?? defaultTag, { ...props, className: [roleClass, className].filter(Boolean).join(" ") }, children);
  };
}

export const PageTitle = role("h1", "ds-page-title");
export const SectionTitle = role("h2", "ds-section-title");
export const CardTitle = role("h3", "ds-card-title");
export const PageIntro = role("p", "ds-page-intro");
export const SectionIntro = role("p", "ds-section-intro");
export const BodyText = role("p", "ds-body");
export const Eyebrow = role("span", "ds-eyebrow");
export const Caption = role("span", "ds-caption");
