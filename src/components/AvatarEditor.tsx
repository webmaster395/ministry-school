"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearAvatar, setAvatar } from "@/lib/actions/avatar";

const SIZE = 256;
const MAX_INPUT = 8 * 1024 * 1024;

/** Recadre en carré au centre et réduit à 256 px : la photo finale pèse quelques dizaines de Ko. */
async function shrink(file: File): Promise<{ blob: Blob; type: string }> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE
  );

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await toBlob("image/webp", 0.82);
  if (webp && webp.type === "image/webp") return { blob: webp, type: "image/webp" };
  const jpeg = await toBlob("image/jpeg", 0.85);
  if (!jpeg) throw new Error("no blob");
  return { blob: jpeg, type: "image/jpeg" };
}

export default function AvatarEditor({
  userId,
  fullName,
  initialUrl,
}: {
  userId: string;
  fullName: string;
  initialUrl: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Choisissez une image (JPEG, PNG ou WebP).");
    if (file.size > MAX_INPUT) return setError("Cette image est trop lourde (8 Mo au plus).");

    setBusy(true);
    try {
      const { blob, type } = await shrink(file);
      const path = `${userId}/avatar.${type === "image/webp" ? "webp" : "jpg"}`;
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: type });
      if (uploadError) throw uploadError;

      setUrl(URL.createObjectURL(blob));
      startTransition(async () => {
        try {
          await setAvatar(path);
        } catch {
          setError("La photo est déposée, mais son enregistrement a échoué.");
        }
      });
    } catch {
      setError("La photo n'a pas pu être envoyée. Réessayez avec une autre image.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function remove() {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      try {
        await clearAvatar();
        setUrl(null);
      } catch {
        setError("La photo n'a pas pu être retirée.");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire signée, non optimisable
        <img src={url} alt="" className="h-20 w-20 shrink-0 rounded-full border border-border object-cover" />
      ) : (
        <div className="font-title flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-accent text-2xl text-on-accent">
          {initials || "?"}
        </div>
      )}

      <div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="text-sm font-medium text-foreground underline underline-offset-2 disabled:opacity-50"
          >
            {busy ? "Envoi en cours…" : url ? "Changer la photo" : "Ajouter une photo"}
          </button>
          {url && !busy && (
            <button type="button" onClick={remove} className="text-sm text-muted hover:text-link">
              Retirer
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          Facultative. Seuls vous et les Admin pouvez la voir.
        </p>
        {error && <p className="mt-1 text-xs text-link">{error}</p>}
      </div>
    </div>
  );
}
