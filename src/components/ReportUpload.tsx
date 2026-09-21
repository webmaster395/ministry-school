"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordReport } from "@/app/etudiant/services/actions";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = /\.(pdf|pptx?|odp)$/i;

/**
 * Dépôt d'un compte rendu (PDF ou PowerPoint). Le fichier part directement du navigateur vers le
 * stockage : il n'est pas limité par la taille des requêtes du serveur.
 */
export default function ReportUpload({
  opportunityId,
  sessionDate,
  hasReport,
}: {
  opportunityId: string;
  sessionDate: string;
  hasReport: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!ALLOWED.test(file.name)) return setError("Choisissez un fichier PDF ou PowerPoint.");
    if (file.size > MAX_BYTES) return setError("Le fichier dépasse 20 Mo.");

    setBusy(true);
    const supabase = createClient();
    const safe = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
    const path = `${opportunityId}/${sessionDate}-${safe}`;

    const { error: uploadError } = await supabase.storage
      .from("comptes-rendus")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });

    if (uploadError) {
      setBusy(false);
      return setError("Le dépôt a échoué. Réessayez dans un instant.");
    }

    const data = new FormData();
    data.set("opportunity_id", opportunityId);
    data.set("session_date", sessionDate);
    data.set("file_path", path);
    data.set("file_name", file.name);
    startTransition(async () => {
      try {
        await recordReport(data);
      } catch {
        setError("Le fichier est déposé, mais son enregistrement a échoué.");
      } finally {
        setBusy(false);
        if (input.current) input.current.value = "";
      }
    });
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept=".pdf,.ppt,.pptx,.odp"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="text-sm font-medium text-foreground underline underline-offset-2 disabled:opacity-50"
      >
        {busy ? "Dépôt en cours…" : hasReport ? "Remplacer le fichier" : "Déposer le compte rendu"}
      </button>
      {error && <p className="mt-1 text-xs text-link">{error}</p>}
    </div>
  );
}
