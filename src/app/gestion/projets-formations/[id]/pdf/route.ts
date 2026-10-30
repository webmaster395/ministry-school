import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { getOpportunity, getOpportunityDates, getOpportunityInternalMaterial, getOpportunityManagementRevision, getProjectsTrainingRights, mergeOpportunityManagementRevision, opportunityType, TYPE_LABEL } from "@/lib/data/opportunities";
import { getOpportunityAgenda, AGENDA_TYPE_LABELS } from "@/lib/data/opportunity-agenda";
import { linesOf } from "@/lib/opportunity-details";
import { formatSessionDate } from "@/lib/format";
import { SimplePdf } from "@/lib/pdf/simple-pdf";
import { pdfContentBlocks } from "@/lib/pdf/structured-content";

const hm = (value: string) => value.slice(0, 5).replace(":", " h ").replace(/ h 00$/, " h");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const [viewer, rights, publicOpportunity, publicDates, agenda] = await Promise.all([
    getViewer(), getProjectsTrainingRights(supabase, user.id), getOpportunity(supabase, id), getOpportunityDates(supabase, id), getOpportunityAgenda(supabase, id),
  ]);
  if (!publicOpportunity) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const adminScope = new URL(request.url).searchParams.get("scope") === "admin" && !!viewer?.roles.admin;
  const allowed = adminScope || rights.assignments.has(id);
  if (!allowed) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const revision = (adminScope && viewer?.roles.superAdmin) || rights.assignments.has(id)
    ? await getOpportunityManagementRevision(supabase, id)
    : null;
  const { opportunity, dates } = mergeOpportunityManagementRevision(publicOpportunity, publicDates, revision);

  const internalMaterial = adminScope && viewer?.roles.superAdmin ? await getOpportunityInternalMaterial(supabase, id) : null;
  const pdf = new SimplePdf(opportunity.title);
  pdf.banner(TYPE_LABEL[opportunityType(opportunity)], opportunity.services?.name || opportunity.organizer_label);
  pdf.heading("Présentation");
  const presentation = pdfContentBlocks(opportunity.description);
  if (!presentation.length) pdf.paragraph("Aucune présentation renseignée.");
  for (const block of presentation) {
    if (block.kind === "heading") pdf.subheading(block.text);
    if (block.kind === "paragraph") pdf.paragraph(block.text, { preserveLineBreaks: true });
    if (block.kind === "list") block.items.forEach((item, index) => pdf.paragraph(item, { listMarker: block.ordered ? `${block.start + index}.` : "•" }));
  }
  const objectives = linesOf(opportunity.objectives);
  if (objectives.length) { pdf.heading("Objectifs"); objectives.forEach((item) => pdf.paragraph(item, { bullet: true })); }
  const speakers = linesOf(opportunity.speakers);
  if (speakers.length) { pdf.heading("Intervenants"); pdf.paragraph(speakers.join(" • ")); }
  const prerequisites = linesOf(opportunity.prerequisites);
  if (prerequisites.length && !opportunity.participation_prerequisites_required) { pdf.heading("Prérequis"); prerequisites.forEach((item) => pdf.paragraph(item, { bullet: true })); }
  pdf.heading("Conditions de participation");
  pdf.paragraph(opportunity.participation_audience === "specific" ? `Réservé à : ${opportunity.participation_audience_details}` : "Ouvert à tous");
  if (opportunity.participation_prerequisites_required) {
    pdf.paragraph("Prérequis nécessaires");
    prerequisites.forEach((item) => pdf.paragraph(item, { bullet: true }));
  }
  const tools = linesOf(opportunity.tools_used);
  if (tools.length) { pdf.heading("Outils utilisés"); tools.forEach((item) => pdf.paragraph(item, { bullet: true })); }
  pdf.heading("Organisation");
  if (opportunity.location) pdf.keyValue("Lieu principal", opportunity.location);
  pdf.keyValue("Nombre de places", opportunity.capacity ? String(opportunity.capacity) : "Non limité");
  const participantMaterial = linesOf(opportunity.participant_material);
  if (participantMaterial.length) { pdf.subheading("Matériel à apporter par les participants"); participantMaterial.forEach((item) => pdf.paragraph(item, { bullet: true })); }
  if (dates.length) {
    pdf.heading("Séances et déroulé pédagogique");
    for (const date of dates) {
      pdf.subheading(`${formatSessionDate(date.session_date)} · ${hm(date.start_time)}–${hm(date.end_time)}`);
      if (date.location || opportunity.location) pdf.paragraph(date.location || opportunity.location || "", { muted: true });
      const steps = agenda.filter((step) => step.opportunity_date_id === date.id);
      if (steps.length) steps.forEach((step) => pdf.paragraph(`${step.duration_minutes} min · ${step.activity_type === "other" ? step.custom_type : AGENDA_TYPE_LABELS[step.activity_type]} — ${step.explanation}`, { bullet: true }));
      else pdf.paragraph("Aucun déroulé renseigné.", { muted: true });
    }
  }
  if (internalMaterial) {
    pdf.heading("Matériel nécessaire à l’organisation · Interne");
    linesOf(internalMaterial).forEach((item) => pdf.paragraph(item, { bullet: true }));
  }
  const slug = opportunity.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "projet-formation";
  return new NextResponse(pdf.finish(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${slug}.pdf"`, "Cache-Control": "private, no-store" } });
}
