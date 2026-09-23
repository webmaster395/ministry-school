import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStudents } from "@/lib/data/admin";

function csvCell(value: string) {
  // Les guillemets doublés protègent virgules, retours à la ligne et guillemets
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const students = await getStudents(supabase);

  const header = ["Nom", "Ministère", "Jour", "Inscription finalisée", "Date d'inscription"];

  const rows = students.map((s) =>
    [
      s.full_name ?? "",
      s.ministries?.name ?? "",
      s.preferred_day ?? "",
      s.email_confirmed ? "Oui" : "Non",
      new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(s.created_at)),
    ]
      .map(csvCell)
      .join(";")
  );

  // BOM UTF-8 pour qu'Excel affiche correctement les accents
  const csv = "﻿" + [header.map(csvCell).join(";"), ...rows].join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscriptions-ministry-school-${stamp}.csv"`,
    },
  });
}
