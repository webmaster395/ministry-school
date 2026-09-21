import Link from "next/link";
import { BookOpen, CalendarDays, GraduationCap, MessageSquare, Users } from "lucide-react";

const p = { size: 20, strokeWidth: 1.6 } as const;
const icons = {
  book: <BookOpen {...p} />,
  calendar: <CalendarDays {...p} />,
  layers: <GraduationCap {...p} />,
  compass: <Users {...p} />,
  megaphone: <MessageSquare {...p} />,
  users: <Users {...p} />,
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
