import "server-only";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import {
  EDITABLE_PDF_ATTACHMENT_NAME,
  EDITABLE_PDF_MEDIA_TYPE,
  serializeEditablePdfSource,
  type EditablePdfSourceV1,
} from "./editable-pdf-source";

export async function attachEditablePdfSource(pdfBytes: Uint8Array, source: EditablePdfSourceV1) {
  const sourceBytes = serializeEditablePdfSource(source);
  const sourceHash = createHash("sha256").update(sourceBytes).digest("hex");
  const pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  await pdf.attach(sourceBytes, EDITABLE_PDF_ATTACHMENT_NAME, {
    mimeType: EDITABLE_PDF_MEDIA_TYPE,
    description: `Source structurée Ministry School V1 · SHA-256 ${sourceHash}`,
  });
  pdf.setKeywords(["Ministry School", "editable-pdf-v1", `source-sha256:${sourceHash}`]);
  return { bytes: await pdf.save(), sourceHash };
}
