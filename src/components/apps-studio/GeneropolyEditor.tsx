"use client";

import { useState } from "react";
import { Check, Eye, History, Laptop, Loader2, RotateCcw, Save, Send, Smartphone } from "lucide-react";
import type { GeneropolyContent, GeneropolyContentCategory, GeneropolyContentPage, GeneropolyContentPayload } from "@/lib/apps/generopoly";

type Selection = { kind: "page"; id: string } | { kind: "finance" | "time"; id: string };

export default function GeneropolyEditor({ initial }: { initial: GeneropolyContentPayload }) {
  const [payload, setPayload] = useState(initial);
  const [content, setContent] = useState<GeneropolyContent>(() => structuredClone(initial.draft.content));
  const [selection, setSelection] = useState<Selection>({ kind: "page", id: initial.draft.content.pages[0]?.id ?? "welcome" });
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "publish" | "restore" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedPage = selection.kind === "page" ? content.pages.find((item) => item.id === selection.id) : undefined;
  const selectedCategories = selection.kind === "finance" ? content.financeCategories : selection.kind === "time" ? content.timeCategories : undefined;

  function changed(next: GeneropolyContent) { setContent(next); setDirty(true); setMessage(""); setError(""); }
  function changePage(patch: Partial<GeneropolyContentPage>) {
    changed({ ...content, pages: content.pages.map((page) => page.id === selection.id ? { ...page, ...patch } : page) });
  }
  function changeCategory(index: number, patch: Partial<GeneropolyContentCategory>) {
    const field = selection.kind === "finance" ? "financeCategories" : "timeCategories";
    changed({ ...content, [field]: content[field].map((category, current) => current === index ? { ...category, ...patch } : category) });
  }

  async function request(method: "PUT" | "POST", body: unknown) {
    const response = await fetch("/api/admin/apps/generopoly/content", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error || "Action impossible.");
    const refreshed = await fetch("/api/admin/apps/generopoly/content", { cache: "no-store" });
    const next = await refreshed.json() as GeneropolyContentPayload & { error?: string };
    if (!refreshed.ok) throw new Error(next.error || "Actualisation impossible.");
    setPayload(next);
    setContent(structuredClone(next.draft.content));
    setDirty(false);
  }
  async function save() {
    setBusy("save"); setError("");
    try { await request("PUT", { content }); setMessage("Brouillon enregistré."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Sauvegarde impossible."); } finally { setBusy(""); }
  }
  async function publish() {
    setBusy("publish"); setError("");
    try {
      if (dirty) await request("PUT", { content });
      await request("POST", { action: "publish" });
      setMessage("Version publiée. Les parties déjà commencées conservent leur version précédente.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Publication impossible."); } finally { setBusy(""); }
  }
  async function restore(id: string) {
    setBusy("restore"); setError("");
    try { await request("POST", { action: "restore", id }); setMessage("Version restaurée dans un nouveau brouillon."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Restauration impossible."); } finally { setBusy(""); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-sm">{dirty ? <><span className="h-2 w-2 rounded-full bg-[#e18743]" /> Modifications non enregistrées</> : <><Check size={15} className="text-[#34715d]" /> Brouillon synchronisé</>}</div>
      <div className="flex flex-wrap gap-2"><button className="button secondary compact" onClick={save} disabled={!dirty || Boolean(busy)}>{busy === "save" ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Enregistrer le brouillon</button><button className="button compact" onClick={publish} disabled={Boolean(busy)}>{busy === "publish" ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />} Publier</button></div>
    </div>
    {(message || error) && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${error ? "bg-[#fff0ec] text-[#9b371e]" : "bg-[#eef5f0] text-[#285e4d]"}`}>{error || message}</p>}

    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_minmax(300px,.82fr)]">
      <nav className="rounded-[22px] border border-border bg-white p-2 xl:max-h-[760px] xl:overflow-y-auto" aria-label="Pages du parcours">
        <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Pages du parcours</p>
        {content.pages.map((page, index) => <button key={page.id} onClick={() => setSelection({ kind: "page", id: page.id })} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${selection.kind === "page" && selection.id === page.id ? "bg-[#e9efeb] text-[#20302e]" : "text-muted hover:bg-background"}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background text-[10px]">{index + 1}</span><span className="leading-5">{page.label}</span></button>)}
        <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Catégories</p>
        <button onClick={() => setSelection({ kind: "finance", id: "finance" })} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${selection.kind === "finance" ? "bg-[#e9efeb]" : "text-muted hover:bg-background"}`}>Argent</button>
        <button onClick={() => setSelection({ kind: "time", id: "time" })} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${selection.kind === "time" ? "bg-[#e9efeb]" : "text-muted hover:bg-background"}`}>Temps</button>
      </nav>

      <section className="rounded-[22px] border border-border bg-white p-5 sm:p-6">
        {selectedPage ? <PageFields page={selectedPage} onChange={changePage} /> : selectedCategories ? <CategoryFields categories={selectedCategories} onChange={changeCategory} /> : null}
      </section>

      <aside className="space-y-4">
        <section className="rounded-[22px] border border-border bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold"><Eye size={16} /> Aperçu</div><div className="flex rounded-full bg-background p-1"><button aria-label="Aperçu ordinateur" className={`rounded-full p-2 ${device === "desktop" ? "bg-white shadow-sm" : "text-muted"}`} onClick={() => setDevice("desktop")}><Laptop size={15} /></button><button aria-label="Aperçu téléphone" className={`rounded-full p-2 ${device === "phone" ? "bg-white shadow-sm" : "text-muted"}`} onClick={() => setDevice("phone")}><Smartphone size={15} /></button></div></div>
          <Preview page={selectedPage} categories={selectedCategories} device={device} />
        </section>
        <section className="rounded-[22px] border border-border bg-white p-5"><div className="mb-4 flex items-center gap-2 font-semibold"><History size={16} /> Historique</div><div className="space-y-2">{payload.history.slice(0, 8).map((version) => <div key={version.id} className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-0"><div><p className="text-sm">Version {version.version}</p><p className="mt-1 text-xs text-muted">{version.status === "published" ? "Publiée" : version.status === "draft" ? "Brouillon" : "Archivée"} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(version.createdAt)}</p></div>{version.id !== payload.draft.id && <button aria-label={`Restaurer la version ${version.version}`} className="rounded-full border border-border p-2 text-muted hover:text-foreground" onClick={() => restore(version.id)} disabled={Boolean(busy)}><RotateCcw size={14} /></button>}</div>)}</div></section>
      </aside>
    </div>
  </div>;
}

function PageFields({ page, onChange }: { page: GeneropolyContentPage; onChange: (patch: Partial<GeneropolyContentPage>) => void }) {
  return <div className="space-y-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Page sélectionnée</p><h2 className="mt-1 font-title text-2xl">{page.label}</h2></div><Field label="Titre"><input value={page.title} onChange={(event) => onChange({ title: event.target.value })} /></Field><Field label="Sous-titre"><input value={page.subtitle} onChange={(event) => onChange({ subtitle: event.target.value })} /></Field><Field label="Consigne"><textarea rows={3} value={page.instruction} onChange={(event) => onChange({ instruction: event.target.value })} /></Field><Field label="Scénario ou texte d’introduction"><textarea rows={5} value={page.scenario} onChange={(event) => onChange({ scenario: event.target.value })} /></Field>{page.amount !== undefined && <div className="grid gap-4 sm:grid-cols-2"><Field label={page.unit === "€" ? "Budget disponible" : "Temps disponible"}><div className="relative"><input type="number" min="1" value={page.amount} onChange={(event) => onChange({ amount: Number(event.target.value) })} /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">{page.unit}</span></div></Field>{page.minimumCharacters !== undefined && <Field label="Minimum de caractères"><input type="number" min="1" value={page.minimumCharacters} onChange={(event) => onChange({ minimumCharacters: Number(event.target.value) })} /></Field>}</div>}{page.questions && <div className="space-y-4"><h3 className="pt-2 font-semibold">Questions</h3>{page.questions.map((question, index) => <Field key={index} label={`Question ${index + 1}`}><textarea rows={3} value={question} onChange={(event) => { const questions = [...(page.questions ?? [])]; questions[index] = event.target.value; onChange({ questions }); }} /></Field>)}</div>}</div>;
}

function CategoryFields({ categories, onChange }: { categories: GeneropolyContentCategory[]; onChange: (index: number, patch: Partial<GeneropolyContentCategory>) => void }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Catégories du jeu</p><h2 className="mt-1 font-title text-2xl">Libellés et explications</h2><div className="mt-6 space-y-4">{categories.map((category, index) => <article key={category.key} className="grid gap-3 rounded-2xl bg-background p-4 sm:grid-cols-[70px_1fr]"><Field label="Emoji"><input value={category.emoji} onChange={(event) => onChange(index, { emoji: event.target.value })} /></Field><div className="space-y-3"><Field label="Nom"><input value={category.name} onChange={(event) => onChange(index, { name: event.target.value })} /></Field><Field label="Description"><input value={category.description} onChange={(event) => onChange(index, { description: event.target.value })} /></Field></div></article>)}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium"><span className="mb-2 block">{label}</span><span className="block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-border [&_input]:bg-background [&_input]:px-4 [&_input]:py-3 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-border [&_textarea]:bg-background [&_textarea]:px-4 [&_textarea]:py-3">{children}</span></label>; }

function Preview({ page, categories, device }: { page?: GeneropolyContentPage; categories?: GeneropolyContentCategory[]; device: "desktop" | "phone" }) {
  const width = device === "phone" ? "max-w-[240px]" : "max-w-full";
  return <div className={`mx-auto min-h-[360px] overflow-hidden rounded-[22px] bg-[#f7f4ee] shadow-inner transition-all ${width}`}><div className="bg-[#20302e] px-5 py-3 text-xs tracking-wide text-[#fbeeda]">Ministry School · Généropoly</div><div className="p-6">{page ? <><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#28766d]">{page.subtitle}</p><h3 className="mt-3 font-title text-2xl leading-tight">{page.title}</h3>{page.scenario && <p className="mt-4 text-sm leading-6 text-muted">{page.scenario}</p>}{page.amount !== undefined && <div className="mt-5 rounded-2xl bg-white p-4 text-center"><p className="text-xs text-muted">Ressource disponible</p><strong className="mt-1 block text-3xl">{page.amount} {page.unit}</strong></div>}<p className="mt-5 text-sm font-medium">{page.instruction}</p>{page.questions?.slice(0, 2).map((question) => <div key={question} className="mt-3 rounded-xl border border-border bg-white p-3 text-xs leading-5">{question}</div>)}</> : categories ? <><h3 className="font-title text-2xl">Catégories</h3><div className="mt-5 grid gap-3">{categories.map((category) => <div key={category.key} className="flex items-center gap-3 rounded-xl bg-white p-3"><span className="text-xl">{category.emoji}</span><div><p className="text-sm font-semibold">{category.name}</p><p className="text-xs text-muted">{category.description}</p></div></div>)}</div></> : null}</div></div>;
}
