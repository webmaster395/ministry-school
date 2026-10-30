import Link from "next/link";

export default function MembersRolesNav({ active }: { active: "members" | "roles" }) {
  const items = [
    { key: "members", label: "Membres", href: "/gestion/super-admin/membres" },
    { key: "roles", label: "Rôles", href: "/gestion/super-admin/roles" },
  ] as const;
  return <nav aria-label="Membres et rôles" className="tabbar flex flex-wrap gap-2">{items.map((item) => <Link key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined} className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${active === item.key ? "bg-accent text-on-accent" : "bg-surface text-muted hover:bg-foreground/[0.08] hover:text-foreground"}`}>{item.label}</Link>)}</nav>;
}
