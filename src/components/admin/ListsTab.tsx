import Link from "next/link";
import { FileKey2, ListPlus, Pencil, Search, UsersRound, X } from "lucide-react";
import AdminSelect from "@/components/admin/AdminSelect";
import ListMemberPicker from "@/components/admin/ListMemberPicker";
import DeleteUserListForm from "@/components/admin/DeleteUserListForm";
import { createUserList, removeUserListMember, updateUserList } from "@/app/gestion/admin/list-actions";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";

const CATEGORY_LABELS: Record<string, string> = {
  collaborators: "Collaborateurs",
  responsibilities: "Responsabilités",
  sensitivities: "Sensibilités",
  involvements: "Implications",
  other: "Autre",
};
const CATEGORY_OPTIONS = [{ value: "all", label: "Toutes les catégories" }, ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))];
const FORM_CATEGORY_OPTIONS = CATEGORY_OPTIONS.slice(1);
const RESOURCE_LABELS: Record<string, string> = { app_catalog: "Outil", material: "Support de cours", opportunity_resource: "Document ou ressource", managed_resource: "Ressource gérée" };

type ListRow = { id: string; name: string; description: string | null; category: string; created_at: string };
type LinkRow = { list_id: string; resource_type: string; resource_id: string };

export default async function ListsTab({ q = "", category = "all", selectedId = "", embedded = false }: { q?: string; category?: string; selectedId?: string; embedded?: boolean }) {
  const supabase = await createClient();
  const [{ data: rawLists, error: listsError }, { data: memberships, error: membershipsError }, { data: links, error: linksError }, members, { data: apps }, { data: materials }, { data: opportunityResources }, { data: managedResources }] = await Promise.all([
    supabase.from("user_lists").select("id,name,description,category,created_at").order("name"),
    supabase.from("user_list_members").select("list_id,user_id,created_at"),
    supabase.from("resource_access_lists").select("list_id,resource_type,resource_id"),
    getMembers(supabase),
    supabase.from("app_catalog").select("id,name"),
    supabase.from("materials").select("id,title"),
    supabase.from("opportunity_resources").select("id,title"),
    supabase.from("managed_resources").select("id,title"),
  ]);
  const loadError = listsError ?? membershipsError ?? linksError;
  if (loadError) return <div className="space-y-5">
    {!embedded && <ManagementPageHeader eyebrow="ADMIN" title="Listes" subtitle="Créez des groupes de personnes réutilisables pour contrôler l’accès aux outils et aux documents." mobileTitleInAppBar />}
    <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
      <h2 className="font-semibold">Les listes ne peuvent pas être chargées.</h2>
      <p className="mt-1">Réessayez dans un instant. Si le problème persiste, vérifiez que la migration des listes et des accès a bien été appliquée.</p>
    </section>
  </div>;
  const lists = (rawLists ?? []) as ListRow[];
  const accessLinks = (links ?? []) as LinkRow[];
  const memberCount = new Map<string, number>();
  const resourceCount = new Map<string, number>();
  for (const membership of memberships ?? []) memberCount.set(membership.list_id, (memberCount.get(membership.list_id) ?? 0) + 1);
  for (const link of accessLinks) resourceCount.set(link.list_id, (resourceCount.get(link.list_id) ?? 0) + 1);
  const resourceNames = new Map<string, string>([
    ...(apps ?? []).map((item) => [`app_catalog:${item.id}`, item.name] as const),
    ...(materials ?? []).map((item) => [`material:${item.id}`, item.title] as const),
    ...(opportunityResources ?? []).map((item) => [`opportunity_resource:${item.id}`, item.title] as const),
    ...(managedResources ?? []).map((item) => [`managed_resource:${item.id}`, item.title] as const),
  ]);
  const needle = q.trim().toLocaleLowerCase("fr-FR");
  const shown = lists.filter((list) => (!needle || `${list.name} ${list.description ?? ""}`.toLocaleLowerCase("fr-FR").includes(needle)) && (category === "all" || list.category === category));
  const selected = lists.find((list) => list.id === selectedId);
  const selectedMemberIds = new Set((memberships ?? []).filter((item) => item.list_id === selectedId).map((item) => item.user_id));
  const selectedMembers = members.filter((member) => selectedMemberIds.has(member.id));
  const availableMembers = members.filter((member) => !member.deactivated && !selectedMemberIds.has(member.id));
  const selectedResources = accessLinks.filter((link) => link.list_id === selectedId);
  const date = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));

  return <div className="space-y-5">
    {!embedded && <ManagementPageHeader eyebrow="ADMIN" title="Listes" subtitle="Créez des groupes de personnes réutilisables pour contrôler l’accès aux outils et aux documents." mobileTitleInAppBar />}

    <details className="group rounded-2xl border border-border bg-background p-4 open:p-5 sm:p-5">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden"><ListPlus size={17} /> Créer une liste</summary>
      <form action={createUserList} className="mt-4 grid gap-4 border-t border-border-soft pt-4 md:grid-cols-2">
        <label className="text-sm font-medium">Nom<input name="name" required maxLength={120} className="mt-1.5 min-h-11 w-full rounded-xl border border-border px-3 outline-none focus:border-foreground" placeholder="Ex. Collaborateurs" /></label>
        <label className="text-sm font-medium">Catégorie<AdminSelect name="category" defaultValue="collaborators" className="mt-1.5" options={FORM_CATEGORY_OPTIONS} /></label>
        <label className="text-sm font-medium md:col-span-2">Description <span className="font-normal text-muted">(facultative)</span><textarea name="description" maxLength={1000} rows={3} className="mt-1.5 w-full rounded-xl border border-border px-3 py-3 outline-none focus:border-foreground" /></label>
        <button className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent md:col-span-2 md:justify-self-end">Créer la liste</button>
      </form>
    </details>

    <form className="grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]" action="/gestion/admin">
      <input type="hidden" name="onglet" value="listes" />
      <label className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input name="q" defaultValue={q} placeholder="Rechercher une liste" className="min-h-11 w-full rounded-xl border border-border pl-9 pr-3 text-sm outline-none focus:border-foreground" /></label>
      <AdminSelect name="categorie" defaultValue={category} options={CATEGORY_OPTIONS} ariaLabel="Catégorie" />
      <button className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold">Filtrer</button>
    </form>

    {selected && <section className="rounded-2xl border border-foreground/20 bg-background p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="label text-[10px] tracking-[.14em] text-muted">DÉTAIL DE LA LISTE</p><h2 className="font-title mt-1 text-[28px]">{selected.name}</h2><p className="mt-1 text-sm text-muted">{memberCount.get(selected.id) ?? 0} membre{(memberCount.get(selected.id) ?? 0) > 1 ? "s" : ""} · {resourceCount.get(selected.id) ?? 0} ressource{(resourceCount.get(selected.id) ?? 0) > 1 ? "s" : ""}</p></div><Link href="/gestion/admin?onglet=listes" aria-label="Fermer le détail" className="grid h-10 w-10 place-items-center self-end rounded-full border border-border text-muted sm:self-auto"><X size={17} /></Link></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
        <div className="space-y-5">
          <form action={updateUserList} className="grid gap-4 rounded-2xl bg-surface p-4 sm:grid-cols-2"><input type="hidden" name="list_id" value={selected.id} /><label className="text-sm font-medium">Nom<input name="name" required defaultValue={selected.name} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3" /></label><label className="text-sm font-medium">Catégorie<AdminSelect name="category" defaultValue={selected.category} className="mt-1.5" options={FORM_CATEGORY_OPTIONS} /></label><label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" defaultValue={selected.description ?? ""} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3" /></label><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-xs font-semibold text-on-accent sm:col-span-2 sm:justify-self-end"><Pencil size={14} /> Enregistrer</button></form>
          <section><h3 className="font-title text-xl">Membres · {selectedMembers.length}</h3>{selectedMembers.length ? <ul className="mt-3 divide-y divide-border-soft rounded-2xl border border-border">{selectedMembers.map((member) => <li key={member.id} className="flex items-center gap-3 p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-sm font-semibold">{member.full_name.charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{member.full_name || "Sans nom"}</strong><small className="block truncate text-muted">{member.email}</small></span><form action={removeUserListMember}><input type="hidden" name="list_id" value={selected.id} /><button name="user_id" value={member.id} className="min-h-9 rounded-full border border-border px-3 text-xs font-semibold text-muted hover:text-foreground">Retirer</button></form></li>)}</ul> : <p className="mt-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted">Cette liste ne contient encore aucun membre.</p>}</section>
          <section><h3 className="font-title text-xl">Ressources accessibles · {selectedResources.length}</h3>{selectedResources.length ? <ul className="mt-3 space-y-2">{selectedResources.map((resource) => <li key={`${resource.resource_type}:${resource.resource_id}`} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"><FileKey2 size={17} className="shrink-0 text-muted" /><span><strong className="block text-sm">{resourceNames.get(`${resource.resource_type}:${resource.resource_id}`) ?? "Ressource"}</strong><small className="text-muted">{RESOURCE_LABELS[resource.resource_type] ?? resource.resource_type}</small></span></li>)}</ul> : <p className="mt-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted">Aucune ressource n’utilise encore cette liste.</p>}</section>
          <div className="border-t border-border pt-5"><DeleteUserListForm id={selected.id} name={selected.name} resourceCount={selectedResources.length} /></div>
        </div>
        <ListMemberPicker listId={selected.id} members={availableMembers.map((member) => ({ id: member.id, name: member.full_name, email: member.email }))} />
      </div>
    </section>}

    {shown.length ? <section className="overflow-hidden rounded-2xl border border-border bg-background"><div className="hidden grid-cols-[1.2fr_1fr_110px_120px_120px] gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-[.12em] text-muted lg:grid"><span>Liste</span><span>Catégorie</span><span>Membres</span><span>Ressources</span><span>Création</span></div>{shown.map((list) => <Link key={list.id} href={`/gestion/admin?onglet=listes&liste=${list.id}`} className="grid gap-3 border-b border-border-soft p-4 transition last:border-0 hover:bg-surface lg:grid-cols-[1.2fr_1fr_110px_120px_120px] lg:items-center lg:px-5"><span><strong className="block text-sm">{list.name}</strong><small className="mt-1 block line-clamp-2 text-muted">{list.description || "Sans description"}</small></span><span className="text-sm">{CATEGORY_LABELS[list.category] ?? list.category}</span><span className="inline-flex items-center gap-2 text-sm"><UsersRound size={15} className="text-muted" /> {memberCount.get(list.id) ?? 0}</span><span className="inline-flex items-center gap-2 text-sm"><FileKey2 size={15} className="text-muted" /> {resourceCount.get(list.id) ?? 0}</span><span className="text-sm text-muted">{date(list.created_at)}</span></Link>)}</section> : <section className="rounded-2xl border border-dashed border-border p-8 text-center"><UsersRound size={24} className="mx-auto text-muted" /><h2 className="font-title mt-3 text-xl">Aucune liste</h2><p className="mt-1 text-sm text-muted">Créez votre première liste ou modifiez les filtres.</p></section>}
  </div>;
}

