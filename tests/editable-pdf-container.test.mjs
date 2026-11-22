import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { NATHALIE_PROOF_EDITED_SOURCE } from "../src/lib/preparation/editable-pdf-proof.ts";
import {
  EDITABLE_PDF_ATTACHMENT_NAME,
  EDITABLE_PDF_MEDIA_TYPE,
  parseEditablePdfSource,
  serializeEditablePdfSource,
} from "../src/lib/preparation/editable-pdf-source.ts";

test("un PDF créé par un autre moteur conserve et restitue la source V1", async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("Ministry School compatibility proof", { x: 72, y: 760, size: 14, font });
  await pdf.attach(serializeEditablePdfSource(NATHALIE_PROOF_EDITED_SOURCE), EDITABLE_PDF_ATTACHMENT_NAME, {
    mimeType: EDITABLE_PDF_MEDIA_TYPE,
  });

  const document = await pdfjs.getDocument({ data: await pdf.save(), disableWorker: true }).promise;
  const attachments = await document.getAttachments();
  const attachment = attachments?.[EDITABLE_PDF_ATTACHMENT_NAME];
  assert.ok(attachment);
  assert.equal(document.numPages, 1);
  assert.deepEqual(parseEditablePdfSource(attachment.content), NATHALIE_PROOF_EDITED_SOURCE);
});
