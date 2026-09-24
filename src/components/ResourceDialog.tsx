"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addSupport } from "@/app/gestion/pilotage/actions";
import { RESOURCE_TYPES, VISIBILITIES } from "@/lib/material-types";

const ALLOWED = /\.(pdf|pptx?|docx?|xlsx?|odp|odt|ods)$/i;
const MAX_BYTES = 20 * 1024 * 1024;
const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] text-foreground";
const label = "mb-1.5 block text-[14px] text-muted";

/**
 * « Ajouter une ressource » : type, titre, lien ou fichier (PDF, PowerPoint, Word, Excel ; 20 Mo)
 * et moment où elle devient visible pour les étudiants.
 */
export default function ResourceDialog({ sessionId, withTypes }: { sessionId: string; withTypes: boolean }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setFile(null);
    setError(null);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    const typedUrl = String(form.get("link_url") ?? "").trim();
    if (!file && !typedUrl) return setError("Ajoutez un lien ou choisissez un fichier.");

    setBusy(true);
    try {
      let url = typedUrl;
      if (file) {
        if (!ALLOWED.test(file.name)) throw new Error("Choisissez un fichier PDF, PowerPoint, Word ou Excel.");
        if (file.size > MAX_BYTES) throw new Error("Le fichier dépasse 20 Mo.");
        const supabase = createClient();
        const safe = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
        const path = `${sessionId}/${crypto.randomUUID()}/${safe}`;
        const { error: uploadError } = await supabase.storage
          .from("supports-cours")
          .upload(path, file, { contentType: file.type || undefined });
        if (uploadError) throw new Error("Le dépôt du fichier a échoué. Réessayez dans un instant.");
        url = supabase.storage.from("supports-cours").getPublicUrl(path).data.publicUrl;
      }
      form.set("link_url", url);
      form.set("session_id", sessionId);
      if (!String(form.get("title") ?? "").trim() && file) form.set("title", file.name.replace(/\.[^.]+$/, ""));
      await addSupport(form);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'ajout a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border bg-surface px-5 py-2.5 text-[15px] text-foreground transition hover:border-foreground"
      >
        Ajouter une ressource
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && close()}>
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-label="Ajouter une ressource"
            className="relative max-h-[94dvh] w-full max-w-[480px] space-y-4 overflow-y-auto rounded-2xl bg-background p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <button type="button" onClick={close} aria-label="Fermer" className="absolute right-4 top-4 rounded-md p-1 text-muted transition hover:bg-foreground/[0.06] hover:text-foreground">
              <X size={18} />
            </button>
            <header className="pr-6">
              <h2 className="font-title text-[22px] leading-tight text-foreground">Ajouter une ressource</h2>
              <p className="mt-1.5 text-[14px] text-muted">Choisissez son type, son lien et le moment où elle devient visible.</p>
            </header>

            {withTypes && (
              <div>
                <label className={label} htmlFor="r-type">Type</label>
                <select id="r-type" name="resource_type" defaultValue="Document PDF" className={field}>
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={label} htmlFor="r-title">Titre</label>
              <input id="r-title" name="title" className={field} />
            </div>

            <div>
              <label className={label} htmlFor="r-url">Lien ou fichier</label>
              <input id="r-url" name="link_url" type="url" placeholder="https://…" disabled={!!file} className={`${field} disabled:opacity-50`} />
              <input
                ref={input}
                type="file"
                className="sr-only"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.odp,.odt,.ods"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="mt-2 flex items-center gap-3 text-[14px]">
                <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-2 text-foreground underline underline-offset-2">
                  <Paperclip size={15} /> {file ? "Changer de fichier" : "Ou choisir un fichier"}
                </button>
                {file && (
                  <span className="min-w-0 truncate text-muted">
                    {file.name}{" "}
                    <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }} className="text-foreground underline">
                      retirer
                    </button>
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] text-muted">PDF, PowerPoint, Word ou Excel · 20 Mo maximum</p>
            </div>

            <div>
              <label className={label} htmlFor="r-visibility">Visibilité</label>
              <select id="r-visibility" name="visibility" defaultValue="now" className={field}>
                {VISIBILITIES.map((v) => (
                  <option key={v.key} value={v.key}>{v.label}</option>
                ))}
              </select>
            </div>

            {error && <p role="alert" className="rounded-lg border border-m-doctoral/30 bg-m-doctoral/10 px-3 py-2 text-[14px] text-link">{error}</p>}

            <button type="submit" disabled={busy} className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221] disabled:opacity-60">
              {busy ? "Ajout en cours…" : "Ajouter la ressource"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
