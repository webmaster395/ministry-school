import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { extractEditablePdfSourceFromPdf } from "@/lib/preparation/editable-pdf-import";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Ajoutez un fichier PDF." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") return NextResponse.json({ error: "Le fichier doit être au format PDF." }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: "Le PDF dépasse 15 Mo." }, { status: 413 });

  try {
    const result = await extractEditablePdfSourceFromPdf(new Uint8Array(await file.arrayBuffer()), file.name);
    return NextResponse.json({
      ...result,
      warning: "La mise en page a été reconstruite à partir du texte du PDF. Le texte n’a pas été réécrit.",
    });
  } catch (error) {
    console.error("Editable PDF import failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Le PDF n’a pas pu être converti." }, { status: 422 });
  }
}
