"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { NATHALIE_PROOF_EDITED_SOURCE } from "@/lib/preparation/editable-pdf-proof";
import EditablePdfProofDocument from "./EditablePdfProofDocument";

export default function EditablePdfProofViewer() {
  return <PDFViewer width="100%" height="100%" showToolbar className="border-0">
    <EditablePdfProofDocument source={NATHALIE_PROOF_EDITED_SOURCE} />
  </PDFViewer>;
}
