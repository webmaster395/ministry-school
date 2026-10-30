import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function SuperAdminHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header>
    <Link href="/gestion/super-admin" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"><ChevronLeft size={16} /> Super administration</Link>
    <p className="label mt-5 text-xs tracking-[.18em] text-muted">SUPER ADMINISTRATION</p>
    <h1 className="font-title mt-2 text-[32px] leading-tight text-foreground sm:text-[38px]">{title}</h1>
    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{subtitle}</p>
  </header>;
}
