import { createElement } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import EditablePdfProofDocument from "@/components/preparation/EditablePdfProofDocument";
import { getViewer } from "@/lib/data/viewer";
import { attachEditablePdfSource } from "@/lib/preparation/editable-pdf-container";
import { extractEditablePdfSourceFromPdf } from "@/lib/preparation/editable-pdf-import";
import { NATHALIE_PROOF_EDITED_SOURCE, NATHALIE_PROOF_SOURCE } from "@/lib/preparation/editable-pdf-proof";
import { isEditablePdfSource, type EditablePdfSourceV1 } from "@/lib/preparation/editable-pdf-source";

export const runtime = "nodejs";

const logoDataUriPromise = readFile(path.join(process.cwd(), "public", "logo-compact.png"))
  .then((bytes) => `data:image/png;base64,${bytes.toString("base64")}`);

async function renderEditablePdf(source: EditablePdfSourceV1) {
  const logoSrc = await logoDataUriPromise;
  const document = createElement(EditablePdfProofDocument, { source, logoSrc }) as unknown as Parameters<typeof renderToBuffer>[0];
  const previewBytes = await renderToBuffer(document);
  return attachEditablePdfSource(previewBytes, source);
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    const viewer = await getViewer();
    if (!viewer?.roles.superAdmin || viewer.deactivated) return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const url = new URL(request.url);
  const source = url.searchParams.get("variant") === "edited" ? NATHALIE_PROOF_EDITED_SOURCE : NATHALIE_PROOF_SOURCE;
  const shouldEmbed = url.searchParams.get("embedded") !== "0";
  const result = shouldEmbed
    ? await renderEditablePdf(source)
    : { bytes: await renderToBuffer(createElement(EditablePdfProofDocument, { source, logoSrc: await logoDataUriPromise }) as unknown as Parameters<typeof renderToBuffer>[0]), sourceHash: "preview-only" };
  return new Response(Buffer.from(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=Ministry-School-Decouvre-ce-qui-te-rend-unique.pdf",
      "Cache-Control": "no-store",
      "X-Ministry-Source-SHA256": result.sourceHash,
    },
  });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return Response.json({ error: "Aperçu indisponible." }, { status: 404 });
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Ajoutez un fichier PDF." }, { status: 400 });
    try {
      const result = await extractEditablePdfSourceFromPdf(new Uint8Array(await file.arrayBuffer()), file.name);
      return Response.json({ ...result, warning: "La mise en page a été reconstruite à partir du texte du PDF. Le texte n’a pas été réécrit." });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Le PDF n’a pas pu être converti." }, { status: 422 });
    }
  }
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return Response.json({ error: "PDF Ministry School invalide." }, { status: 400 }); }
  const source = (raw as { source?: unknown } | null)?.source;
  if (!isEditablePdfSource(source)) return Response.json({ error: "La source structurée du PDF est invalide ou incompatible." }, { status: 400 });
  const result = await renderEditablePdf(source);
  return new Response(Buffer.from(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Ministry-School-Synthese-${source.document.date}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Ministry-Source-SHA256": result.sourceHash,
    },
  });
}
