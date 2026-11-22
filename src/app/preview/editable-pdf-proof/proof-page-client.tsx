"use client";

import dynamic from "next/dynamic";

const EditablePdfProofViewer = dynamic(() => import("@/components/preparation/EditablePdfProofViewer"), {
  ssr: false,
  loading: () => <div className="grid min-h-screen place-items-center bg-[#e6e3dd] text-sm text-[#68706f]">Composition de la preuve A4…</div>,
});

export default function EditablePdfProofPageClient() {
  return <main className="h-screen bg-[#d8d5cf] p-3"><EditablePdfProofViewer /></main>;
}
