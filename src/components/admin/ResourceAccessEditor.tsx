"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, ShieldCheck, UsersRound } from "lucide-react";
import { LIST_CATEGORY_LABELS, type ListCategory, type ResourceAccessType, type ResourceVisibilityMode } from "@/lib/resource-access";

type AccessList = { id: string; name: string; description: string | null; category: string; memberCount: number };
type AccessUser = { id: string; name: string; email: string };
type Payload = {
  configured: boolean;
  mode: ResourceVisibilityMode;
  selectedListIds: string[];
  selectedCategories: ListCategory[];
  selectedUserIds: string[];
  lists: AccessList[];
  users: AccessUser[];
};

const MODES: { value: ResourceVisibilityMode; title: string; description: string }[] = [
  { value: "all_authenticated", title: "Tous les utilisateurs", description: "Accessible à toute personne authentifiée et active." },
  { value: "super_admin_only", title: "Super administrateurs uniquement", description: "Aucun autre utilisateur ne peut ouvrir la ressource, même avec son adresse directe." },
  { value: "selected_lists", title: "Listes et catégories sélectionnées", description: "L’appartenance à au moins une liste choisie, directement ou via sa catégorie, suffit." },
  { value: "selected_users", title: "Personnes sélectionnées", description: "Accès individuel, indépendant de l’appartenance aux listes." },
];

export default function ResourceAccessEditor({ resourceType, resourceId, configureByDefault = false }: {
  resourceType: ResourceAccessType;
  resourceId?: string;
  configureByDefault?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(configureByDefault);
  const [mode, setMode] = useState<ResourceVisibilityMode>("all_authenticated");
  const [lists, setLists] = useState<AccessList[]>([]);
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ListCategory[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const search = new URLSearchParams({ type: resourceType });
    if (resourceId) search.set("id", resourceId);
    fetch(`/api/admin/resource-access/options?${search}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as Payload & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Chargement impossible.");
        setLists(body.lists);
        setUsers(body.users);
        setConfigured(configureByDefault || body.configured);
        setMode(body.mode);
        setSelectedLists(body.selectedListIds);
        setSelectedCategories(body.selectedCategories ?? []);
        setSelectedUsers(body.selectedUserIds);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Chargement impossible.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [configureByDefault, resourceId, resourceType]);

  const normalized = query.trim().toLocaleLowerCase("fr-FR");
  const shownLists = useMemo(() => normalized ? lists.filter((list) => `${list.name} ${list.description ?? ""}`.toLocaleLowerCase("fr-FR").includes(normalized)) : lists, [lists, normalized]);
  const shownUsers = useMemo(() => normalized ? users.filter((user) => `${user.name} ${user.email}`.toLocaleLowerCase("fr-FR").includes(normalized)) : users, [users, normalized]);
  const toggle = (items: string[], id: string, setter: (items: string[]) => void) => setter(items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  const listNames = lists.filter((list) => selectedLists.includes(list.id)).map((list) => list.name);
  const categoryNames = selectedCategories.map((category) => LIST_CATEGORY_LABELS[category]);
  const summary = mode === "all_authenticated" ? "Tous les utilisateurs authentifiés (super administrateurs inclus)"
    : mode === "super_admin_only" ? "Accessible uniquement aux super administrateurs"
      : mode === "selected_lists" ? listNames.length || categoryNames.length
        ? `Super administrateurs${listNames.length ? ` + listes : ${listNames.join(", ")}` : ""}${categoryNames.length ? ` + catégories : ${categoryNames.join(", ")}` : ""}`
        : "Super administrateurs uniquement (aucune liste ou catégorie sélectionnée)"
        : selectedUsers.length ? `Super administrateurs + ${selectedUsers.length} personne${selectedUsers.length > 1 ? "s" : ""} sélectionnée${selectedUsers.length > 1 ? "s" : ""}` : "Super administrateurs uniquement (aucune personne sélectionnée)";

  return <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
    <input type="hidden" name="accessConfigured" value={configured ? "1" : "0"} />
    <input type="hidden" name="accessMode" value={mode} />
    {selectedLists.map((id) => <input key={id} type="hidden" name="accessListIds" value={id} />)}
    {selectedCategories.map((category) => <input key={category} type="hidden" name="accessCategories" value={category} />)}
    {selectedUsers.map((id) => <input key={id} type="hidden" name="accessUserIds" value={id} />)}

    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface"><ShieldCheck size={19} /></span><div><h2 className="font-title text-xl font-normal">Visibilité et accès</h2><p className="mt-1 text-sm leading-6 text-muted">Les super administrateurs conservent toujours l’accès. Les changements s’appliquent immédiatement côté serveur. Une règle privée retire aussi la ressource des interfaces publiques.</p></div></div>

    {loading ? <p className="mt-5 flex items-center gap-2 text-sm text-muted"><Loader2 size={16} className="animate-spin" /> Chargement des listes et des membres…</p> : error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : <>
      {!configured && <div className="mt-5 rounded-xl border border-border-soft bg-surface p-4"><p className="text-sm font-medium">Visibilité historique conservée</p><p className="mt-1 text-xs leading-5 text-muted">Aucune règle transversale n’est encore appliquée à cette ressource.</p><button type="button" onClick={() => setConfigured(true)} className="mt-3 min-h-10 rounded-full bg-foreground px-4 text-xs font-semibold text-on-accent">Configurer les accès</button></div>}
      <fieldset disabled={!configured} className={`mt-5 grid gap-3 md:grid-cols-2 ${configured ? "" : "opacity-45"}`}>
        <legend className="sr-only">Mode de visibilité</legend>
        {MODES.map((item) => <label key={item.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${mode === item.value ? "border-foreground bg-surface" : "border-border-soft"}`}>
          <input type="radio" checked={mode === item.value} onChange={() => { setConfigured(true); setMode(item.value); setQuery(""); }} className="mt-1 accent-foreground" />
          <span><strong className="block text-sm font-semibold">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span></span>
        </label>)}
      </fieldset>

      {configured && (mode === "selected_lists" || mode === "selected_users") && <div className="mt-5 rounded-xl border border-border-soft p-4">
        {mode === "selected_lists" && <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Catégories de listes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.entries(LIST_CATEGORY_LABELS) as [ListCategory, string][]).map(([category, label]) => { const active = selectedCategories.includes(category); return <button type="button" key={category} onClick={() => toggle(selectedCategories, category, (items) => setSelectedCategories(items as ListCategory[]))} aria-pressed={active} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold ${active ? "border-foreground bg-foreground text-on-accent" : "border-border bg-background text-foreground"}`}>{active && <Check size={14} />}{label}</button>; })}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">Une catégorie autorise automatiquement les membres de toutes les listes qu’elle contient.</p>
        </div>}
        <label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === "selected_lists" ? "Rechercher une liste" : "Rechercher par nom ou e-mail"} className="min-h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground" /></label>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain">
          {mode === "selected_lists" ? shownLists.map((list) => { const active = selectedLists.includes(list.id); return <button type="button" key={list.id} onClick={() => toggle(selectedLists, list.id, setSelectedLists)} aria-pressed={active} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left ${active ? "border-foreground bg-surface" : "border-border-soft"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-foreground text-on-accent" : "bg-surface text-muted"}`}>{active ? <Check size={15} /> : <UsersRound size={14} />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{list.name}</strong><small className="text-muted">{list.memberCount} membre{list.memberCount > 1 ? "s" : ""}</small></span></button>; }) : shownUsers.map((user) => { const active = selectedUsers.includes(user.id); return <button type="button" key={user.id} onClick={() => toggle(selectedUsers, user.id, setSelectedUsers)} aria-pressed={active} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left ${active ? "border-foreground bg-surface" : "border-border-soft"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-foreground text-on-accent" : "bg-surface text-muted"}`}>{active ? <Check size={15} /> : <span className="text-xs font-semibold">{user.name.charAt(0).toUpperCase()}</span>}</span><span className="min-w-0"><strong className="block truncate text-sm">{user.name || "Sans nom"}</strong><small className="block truncate text-muted">{user.email}</small></span></button>; })}
          {(mode === "selected_lists" ? shownLists : shownUsers).length === 0 && <p className="px-2 py-5 text-center text-sm text-muted">Aucun résultat.</p>}
        </div>
        <p className="mt-3 text-xs text-muted">{mode === "selected_lists" ? `${selectedLists.length} liste${selectedLists.length > 1 ? "s" : ""} et ${selectedCategories.length} catégorie${selectedCategories.length > 1 ? "s" : ""} sélectionnée${selectedCategories.length > 1 ? "s" : ""}` : `${selectedUsers.length} personne${selectedUsers.length > 1 ? "s" : ""} sélectionnée${selectedUsers.length > 1 ? "s" : ""}`}. Une sélection vide rend la ressource inaccessible aux utilisateurs ordinaires.</p>
      </div>}
      {configured && <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm font-medium">{summary}.</p>}
    </>}
  </section>;
}

