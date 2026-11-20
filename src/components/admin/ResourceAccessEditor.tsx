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

export default function ResourceAccessEditor({ resourceType, resourceId, configureByDefault = false }: {
  resourceType: ResourceAccessType;
  resourceId?: string;
  configureByDefault?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(configureByDefault);
  const [allUsers, setAllUsers] = useState(true);
  const [listsAudience, setListsAudience] = useState(false);
  const [peopleAudience, setPeopleAudience] = useState(false);
  const [lists, setLists] = useState<AccessList[]>([]);
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ListCategory[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [listQuery, setListQuery] = useState("");
  const [userQuery, setUserQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const search = new URLSearchParams({ type: resourceType });
    if (resourceId) search.set("id", resourceId);
    fetch(`/api/admin/resource-access/options?${search}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as Payload & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Chargement impossible.");
        const categories = body.selectedCategories ?? [];
        setLists(body.lists);
        setUsers(body.users);
        setConfigured(configureByDefault || body.configured);
        setAllUsers(body.mode === "all_authenticated");
        setListsAudience(body.mode === "selected_lists" || (body.mode === "selected_audiences" && (body.selectedListIds.length > 0 || categories.length > 0)));
        setPeopleAudience(body.mode === "selected_users" || (body.mode === "selected_audiences" && body.selectedUserIds.length > 0));
        setSelectedLists(body.selectedListIds);
        setSelectedCategories(categories);
        setSelectedUsers(body.selectedUserIds);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Chargement impossible.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [configureByDefault, resourceId, resourceType]);

  const normalizedListQuery = listQuery.trim().toLocaleLowerCase("fr-FR");
  const normalizedUserQuery = userQuery.trim().toLocaleLowerCase("fr-FR");
  const shownLists = useMemo(() => normalizedListQuery ? lists.filter((list) => `${list.name} ${list.description ?? ""}`.toLocaleLowerCase("fr-FR").includes(normalizedListQuery)) : lists, [lists, normalizedListQuery]);
  const shownUsers = useMemo(() => normalizedUserQuery ? users.filter((user) => `${user.name} ${user.email}`.toLocaleLowerCase("fr-FR").includes(normalizedUserQuery)) : users, [users, normalizedUserQuery]);
  const toggle = (items: string[], id: string, setter: (items: string[]) => void) => setter(items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  const listNames = listsAudience ? lists.filter((list) => selectedLists.includes(list.id)).map((list) => list.name) : [];
  const categoryNames = listsAudience ? selectedCategories.map((category) => LIST_CATEGORY_LABELS[category]) : [];
  const selectedPeopleCount = peopleAudience ? selectedUsers.length : 0;
  const accessMode: ResourceVisibilityMode = allUsers ? "all_authenticated" : "selected_audiences";
  const summary = allUsers
    ? "Tous les utilisateurs authentifiés (super administrateurs inclus)"
    : `Super administrateurs${listNames.length ? ` + listes : ${listNames.join(", ")}` : ""}${categoryNames.length ? ` + catégories : ${categoryNames.join(", ")}` : ""}${selectedPeopleCount ? ` + ${selectedPeopleCount} personne${selectedPeopleCount > 1 ? "s" : ""} sélectionnée${selectedPeopleCount > 1 ? "s" : ""}` : ""}`;

  const selectAllUsers = (checked: boolean) => {
    setConfigured(true);
    setAllUsers(checked);
    if (checked) {
      setListsAudience(false);
      setPeopleAudience(false);
    }
  };
  const selectListsAudience = (checked: boolean) => {
    setConfigured(true);
    setAllUsers(false);
    setListsAudience(checked);
  };
  const selectPeopleAudience = (checked: boolean) => {
    setConfigured(true);
    setAllUsers(false);
    setPeopleAudience(checked);
  };

  return <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
    <input type="hidden" name="accessConfigured" value={configured ? "1" : "0"} />
    <input type="hidden" name="accessMode" value={accessMode} />
    {listsAudience && selectedLists.map((id) => <input key={id} type="hidden" name="accessListIds" value={id} />)}
    {listsAudience && selectedCategories.map((category) => <input key={category} type="hidden" name="accessCategories" value={category} />)}
    {peopleAudience && selectedUsers.map((id) => <input key={id} type="hidden" name="accessUserIds" value={id} />)}

    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface"><ShieldCheck size={19} /></span><div><h2 className="font-title text-xl font-normal">Visibilité et accès</h2><p className="mt-1 text-sm leading-6 text-muted">Cumulez les audiences autorisées. Les super administrateurs conservent toujours l’accès et les changements s’appliquent immédiatement côté serveur.</p></div></div>

    {loading ? <p className="mt-5 flex items-center gap-2 text-sm text-muted"><Loader2 size={16} className="animate-spin" /> Chargement des listes et des membres…</p> : error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : <>
      {!configured && <div className="mt-5 rounded-xl border border-border-soft bg-surface p-4"><p className="text-sm font-medium">Visibilité historique conservée</p><p className="mt-1 text-xs leading-5 text-muted">Aucune règle transversale n’est encore appliquée à cette ressource.</p><button type="button" onClick={() => setConfigured(true)} className="mt-3 min-h-10 rounded-full bg-foreground px-4 text-xs font-semibold text-on-accent">Configurer les accès</button></div>}
      <fieldset disabled={!configured} className={`mt-5 grid gap-3 md:grid-cols-2 ${configured ? "" : "opacity-45"}`}>
        <legend className="sr-only">Audiences autorisées</legend>
        <AudienceChoice checked={allUsers} onChange={selectAllUsers} title="Tous les utilisateurs" description="Donne accès à toute personne authentifiée et active." />
        <AudienceChoice checked disabled title="Super administrateurs" description="Toujours inclus pour garantir la gestion de la ressource." />
        <AudienceChoice checked={listsAudience} onChange={selectListsAudience} title="Listes et catégories" description="Ajoutez une ou plusieurs listes et catégories de listes." />
        <AudienceChoice checked={peopleAudience} onChange={selectPeopleAudience} title="Personnes" description="Ajoutez aussi des accès individuels, indépendamment des listes." />
      </fieldset>

      {configured && listsAudience && <div className="mt-5 rounded-xl border border-border-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Catégories de listes</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.entries(LIST_CATEGORY_LABELS) as [ListCategory, string][]).map(([category, label]) => { const active = selectedCategories.includes(category); return <button type="button" key={category} onClick={() => toggle(selectedCategories, category, (items) => setSelectedCategories(items as ListCategory[]))} aria-pressed={active} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold ${active ? "border-foreground bg-foreground text-on-accent" : "border-border bg-background text-foreground"}`}>{active && <Check size={14} />}{label}</button>; })}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">Une catégorie autorise automatiquement les membres de toutes les listes qu’elle contient.</p>
        <label className="relative mt-4 block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={listQuery} onChange={(event) => setListQuery(event.target.value)} placeholder="Rechercher une liste" className="min-h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground" /></label>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain">
          {shownLists.map((list) => { const active = selectedLists.includes(list.id); return <button type="button" key={list.id} onClick={() => toggle(selectedLists, list.id, setSelectedLists)} aria-pressed={active} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left ${active ? "border-foreground bg-surface" : "border-border-soft"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-foreground text-on-accent" : "bg-surface text-muted"}`}>{active ? <Check size={15} /> : <UsersRound size={14} />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{list.name}</strong><small className="text-muted">{list.memberCount} membre{list.memberCount > 1 ? "s" : ""}</small></span></button>; })}
          {shownLists.length === 0 && <p className="px-2 py-5 text-center text-sm text-muted">Aucune liste trouvée.</p>}
        </div>
        <p className="mt-3 text-xs text-muted">{selectedLists.length} liste{selectedLists.length > 1 ? "s" : ""} et {selectedCategories.length} catégorie{selectedCategories.length > 1 ? "s" : ""} sélectionnée{selectedCategories.length > 1 ? "s" : ""}.</p>
      </div>}

      {configured && peopleAudience && <div className="mt-5 rounded-xl border border-border-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Personnes autorisées</p>
        <label className="relative mt-3 block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Rechercher par nom ou e-mail" className="min-h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground" /></label>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain">
          {shownUsers.map((user) => { const active = selectedUsers.includes(user.id); return <button type="button" key={user.id} onClick={() => toggle(selectedUsers, user.id, setSelectedUsers)} aria-pressed={active} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left ${active ? "border-foreground bg-surface" : "border-border-soft"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-foreground text-on-accent" : "bg-surface text-muted"}`}>{active ? <Check size={15} /> : <span className="text-xs font-semibold">{user.name.charAt(0).toUpperCase()}</span>}</span><span className="min-w-0"><strong className="block truncate text-sm">{user.name || "Sans nom"}</strong><small className="block truncate text-muted">{user.email}</small></span></button>; })}
          {shownUsers.length === 0 && <p className="px-2 py-5 text-center text-sm text-muted">Aucune personne trouvée.</p>}
        </div>
        <p className="mt-3 text-xs text-muted">{selectedUsers.length} personne{selectedUsers.length > 1 ? "s" : ""} sélectionnée{selectedUsers.length > 1 ? "s" : ""}.</p>
      </div>}

      {configured && <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm font-medium">Accès effectif : {summary}.</p>}
    </>}
  </section>;
}

function AudienceChoice({ checked, title, description, disabled = false, onChange }: { checked: boolean; title: string; description: string; disabled?: boolean; onChange?: (checked: boolean) => void }) {
  return <label className={`flex items-start gap-3 rounded-xl border p-4 transition ${checked ? "border-foreground bg-surface" : "border-border-soft"} ${disabled ? "cursor-default" : "cursor-pointer"}`}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} className="mt-1 accent-foreground" />
    <span><strong className="block text-sm font-semibold">{title}</strong><span className="mt-1 block text-xs leading-5 text-muted">{description}</span></span>
  </label>;
}
