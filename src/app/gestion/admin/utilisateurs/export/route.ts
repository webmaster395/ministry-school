import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { getMembers } from "@/lib/data/admin-hub";
import { getMinistries } from "@/lib/data/admin";
import { getServices } from "@/lib/data/opportunities";

const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!viewer.roles.admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const supabase = await createClient();
  const [members, ministries, services] = await Promise.all([
    getMembers(supabase),
    getMinistries(supabase),
    getServices(supabase),
  ]);
  const ministryNames = new Map(ministries.map((item) => [item.id, item.name]));
  const serviceNames = new Map(services.map((item) => [item.id, item.name]));
  const header = ["Nom", "E-mail", "Genre", "Rôle", "Sensibilité", "Service", "Pilotage ministère", "Projets et formations", "Jour préféré", "Statut du compte", "Date d'inscription"];
  const rows = members.map((member) => [
    member.full_name ?? "",
    member.email ?? "",
    member.gender === "homme" ? "Homme" : member.gender === "femme" ? "Femme" : "",
    member.role === "admin" ? "Administrateur" : "Étudiant",
    ministryNames.get(member.ministry_id ?? "") ?? "",
    serviceNames.get(member.service_id ?? "") ?? "",
    ministryNames.get(member.ministry_lead_of ?? "") ?? "",
    member.is_projects_training_member ? "Oui" : "Non",
    member.preferred_day ?? "",
    member.deactivated ? "Désactivé" : member.email_confirmed ? "Actif" : "À confirmer",
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" }).format(new Date(member.created_at)),
  ].map(csvCell).join(";"));
  const csv = "\ufeff" + [header.map(csvCell).join(";"), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="membres-ministry-school-${stamp}.csv"`,
    },
  });
}
