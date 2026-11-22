import { createElement } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import EditablePdfProofDocument from "@/components/preparation/EditablePdfProofDocument";
import { attachEditablePdfSource } from "@/lib/preparation/editable-pdf-container";
import { NATHALIE_PROOF_EDITED_SOURCE, NATHALIE_PROOF_SOURCE } from "@/lib/preparation/editable-pdf-proof";

export const runtime = "nodejs";

const logoDataUriPromise = readFile(path.join(process.cwd(), "public", "logo-compact.png"))
  .then((bytes) => `data:image/png;base64,${bytes.toString("base64")}`);

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const source = url.searchParams.get("variant") === "edited" ? NATHALIE_PROOF_EDITED_SOURCE : NATHALIE_PROOF_SOURCE;
  const logoSrc = await logoDataUriPromise;
  const document = createElement(EditablePdfProofDocument, { source, logoSrc }) as unknown as Parameters<typeof renderToBuffer>[0];
  const previewBytes = await renderToBuffer(document);
  const shouldEmbed = url.searchParams.get("embedded") !== "0";
  const result = shouldEmbed ? await attachEditablePdfSource(previewBytes, source) : { bytes: previewBytes, sourceHash: "preview-only" };
  return new Response(Buffer.from(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=Ministry-School-Decouvre-ce-qui-te-rend-unique.pdf",
      "Cache-Control": "no-store",
      "X-Ministry-Source-SHA256": result.sourceHash,
    },
  });
}
