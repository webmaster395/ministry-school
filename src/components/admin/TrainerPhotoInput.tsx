/* eslint-disable @next/next/no-img-element -- aperçu local avant upload Supabase */
"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";

export default function TrainerPhotoInput({ name, currentUrl, initials }: { name: string; currentUrl?: string | null; initials: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentUrl ?? "");

  async function prepare(file: File) {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    canvas.getContext("2d")?.drawImage(bitmap, sx, sy, side, side, 0, 0, 800, 800);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    if (!blob || !input.current) return;
    const optimized = new File([blob], "portrait.webp", { type: "image/webp" });
    const transfer = new DataTransfer();
    transfer.items.add(optimized);
    input.current.files = transfer.files;
    setPreview(URL.createObjectURL(optimized));
  }

  return (
    <label className="group relative grid h-24 w-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-border bg-surface text-xl font-semibold text-muted">
      {preview ? <img src={preview} alt="Aperçu du portrait" className="h-full w-full object-cover" /> : <span>{initials || "?"}</span>}
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-foreground/75 py-1.5 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><Camera size={15} /></span>
      <input ref={input} name={name} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => event.target.files?.[0] && void prepare(event.target.files[0])} />
    </label>
  );
}
