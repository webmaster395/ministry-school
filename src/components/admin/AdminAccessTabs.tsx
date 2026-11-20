import Link from "next/link";

const TABS = [
  { key: "membres", label: "Membres", href: "/gestion/admin?onglet=membres" },
  { key: "listes", label: "Listes", href: "/gestion/admin?onglet=listes" },
  { key: "permissions", label: "Permissions", href: "/gestion/admin?onglet=membres&vue=permissions" },
] as const;

export default function AdminAccessTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return <nav aria-label="Utilisateurs et accès" className="w-full sm:max-w-[620px]">
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1">
      {TABS.map((tab) => <Link
        key={tab.key}
        href={tab.href}
        aria-current={active === tab.key ? "page" : undefined}
        className={`min-w-0 rounded-lg px-1 py-2.5 text-center text-[12px] font-semibold transition min-[390px]:text-[13px] sm:px-4 sm:text-sm ${active === tab.key ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}
      >
        {tab.label}
      </Link>)}
    </div>
  </nav>;
}
