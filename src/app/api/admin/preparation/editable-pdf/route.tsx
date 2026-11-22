import { createElement } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import EditablePdfProofDocument from "@/components/preparation/EditablePdfProofDocument";
import { getViewer } from "@/lib/data/viewer";
import { attachEditablePdfSource } from "@/lib/preparation/editable-pdf-container";
import { isEditablePdfSource } from "@/lib/preparation/editable-pdf-source";

export const runtime = "nodejs";

const logoDataUriPromise = readFile(path.join(process.cwd(), "public", "logo-compact.png"))
  .then((bytes) => `data:image/png;base64,${bytes.toString("base64")}`);

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) return Response.json({ error: "Accès refusé." }, { status: 403 });

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return Response.json({ error: "PDF Ministry School invalide." }, { status: 400 }); }
  const source = (raw as { source?: unknown } | null)?.source;
  if (!isEditablePdfSource(source)) return Response.json({ error: "La source structurée du PDF est invalide ou incompatible." }, { status: 400 });

  const logoSrc = await logoDataUriPromise;
  const document = createElement(EditablePdfProofDocument, { source, logoSrc }) as unknown as Parameters<typeof renderToBuffer>[0];
  const rendered = await renderToBuffer(document);
  const result = await attachEditablePdfSource(rendered, source);
  const safeDate = source.document.date || "document";

  return new Response(Buffer.from(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Ministry-School-Synthese-${safeDate}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Ministry-Source-SHA256": result.sourceHash,
    },
  });
}
