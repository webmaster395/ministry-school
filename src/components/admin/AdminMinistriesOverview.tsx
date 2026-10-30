import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SuperAdminHeader from "@/components/admin/SuperAdminHeader";
import MinistryPicto from "@/components/MinistryPicto";
import { createClient } from "@/lib/supabase/server";
import { getMinistries } from "@/lib/data/admin";

export default async function AdminMinistriesOverview() {
  const supabase = await createClient();
  const ministries = (await getMinistries(supabase)).filter((item) => ["apotre", "prophete", "evangeliste", "pasteur", "docteur"].includes(item.slug));
  const { data: sessions } = await supabase.from("sessions").select("ministry_id, editorial_status").eq("session_type", "ministere");
  return <div className="space-y-6"><SuperAdminHeader title="Sensibilités ministérielles" subtitle="Vue administrative des cinq sensibilités. L’espace Pilotage Ministère personnel reste limité aux affectations explicites." /><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{ministries.map((ministry) => { const rows = (sessions ?? []).filter((session) => session.ministry_id === ministry.id); const pending = rows.filter((session) => session.editorial_status === "pending").length; return <Link key={ministry.id} href="/gestion/admin/programme" className="group rounded-2xl border border-border bg-background p-5 transition hover:border-foreground"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-surface"><MinistryPicto slug={ministry.slug} size={23} /></span><span className="min-w-0 flex-1"><strong className="font-title block text-[21px]">{ministry.name}</strong><span className="text-xs text-muted">{rows.length} cours · {pending} en attente</span></span><ChevronRight size={17} className="text-muted transition group-hover:translate-x-0.5" /></div></Link>; })}</section></div>;
}
