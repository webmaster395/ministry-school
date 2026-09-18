import Link from "next/link";

const icons: Record<string, React.ReactNode> = {
  book: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  layers: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  ),
  compass: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-2 5-3-1.5 2-5 3 1.5Z" />
    </svg>
  ),
  megaphone: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 10v4a1 1 0 0 0 1 1h2l4 4V5L6 9H4a1 1 0 0 0-1 1Z" />
      <path d="M14 8.5c1.1.9 1.1 6.1 0 7M17.5 6c2.2 1.7 2.2 10.3 0 12" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" />
      <path d="M16.5 4.8c1.6.4 2.75 1.8 2.75 3.45s-1.15 3.05-2.75 3.45" />
      <path d="M21.5 20c0-2.6-1.9-4.6-4.5-5.3" />
    </svg>
  ),
};

export type QuickLink = { label: string; href: string; icon: keyof typeof icons };

export default function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex items-center gap-3 rounded-lg border border-border bg-background p-[18px] text-[15px] font-medium text-foreground transition hover:border-[#27302f]"
        >
          <span className="text-[#8b918e]">{icons[l.icon]}</span>
          {l.label}
        </Link>
      ))}
    </div>
  );
}
