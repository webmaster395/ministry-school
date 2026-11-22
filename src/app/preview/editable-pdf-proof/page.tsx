import { notFound } from "next/navigation";
import EditablePdfProofPageClient from "./proof-page-client";

export default function EditablePdfProofPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <EditablePdfProofPageClient />;
}
