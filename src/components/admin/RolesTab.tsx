import Link from "next/link";
import { ShieldCheck, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import { getMinistries } from "@/lib/data/admin";
import { getServices } from "@/lib/data/opportunities";
import { signedAvatarUrls } from "@/lib/avatars";
import AdminSelect from "@/components/admin/AdminSelect";
import MemberAccessEditor from "@/components/admin/MemberAccessEditor";
import RoleCommentForm from "@/components/admin/RoleCommentForm";
import { addDelegate, removeDelegate } from "@/app/gestion/admin/actions";

type Category = "administration" | "projects_training" | "ministry";
type DirectoryRow = { user_id: string; category: Category; role_level: string; scope_id: string | null; scope_label: string | null; can_edit: boolean };
type Note = { user_id: string; comment: string };

const categories: Record<Category, { label: string; badge: string; dot: string }> = {
  administration: { label: "Administration", badge: "border-[#d9dfdc] bg-[#f1f3f2] text-foreground", dot: "bg-[#69746f]" },
  projects_training: { label: "Projets et formations", badge: "border-[#f3d9ac] bg-[#fff5e4] text-[#8b5708]", dot: "bg-[#e89b20]" },
  ministry: { label: "Pilotage Ministère", badge: "border-[#d7e3bb] bg-[#f2f7e6] text-[#52662c]", dot: "bg-[#91a956]" },
};

const plain = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("fr-FR");

export default async function RolesTab({ q, category, canManageAccess, basePath }: { q: string; category: string; canManageAccess: boolean; basePath: string }) {
  const supabase = await createClient();
  const [members, ministries, services, directoryResult, notesResult, delegatesResult] = await Promise.all([
    getMembers(supabase),
    getMinistries(supabase),
    getServices(supabase),
    supabase.rpc("admin_role_directory"),
    supabase.from("admin_member_role_notes").select("user_id, comment"),
    canManageAccess ? supabase.from("ministry_delegates").select("id, email, user_id, ministry_id").order("created_at") : Promise.resolve({ data: [] }),
  ]);
  const directory = (directoryResult.data ?? []) as DirectoryRow[];
  const notes = new Map(((notesResult.data ?? []) as Note[]).map((item) => [item.user_id, item.comment]));
  const rowsByUser = new Map<string, DirectoryRow[]>();
  for (const row of directory) rowsByUser.set(row.user_id, [...(rowsByUser.get(row.user_id) ?? []), row]);
  const words = plain(q).split(/\s+/).filter(Boolean);
  const shown = members.filter((member) => {
    const rows = rowsByUser.get(member.id) ?? [];
    if (!rows.length) return false;
    if (category !== "toutes" && !rows.some((row) => row.category === category)) return false;
    const search = plain(`${member.full_name} ${member.email} ${rows.map((row) => `${row.role_level} ${row.scope_label ?? ""} ${categories[row.category].label}`).join(" ")}`);
    return words.every((word) => search.includes(word));
  });
  const avatarUrls = await signedAvatarUrls(supabase, shown.map((member) => member.avatar_path));
  const ministryName = new Map(ministries.map((item) => [item.id, item.name]));
  const isAdminPath = basePath === "/gestion/admin";

  return <div className="space-y-5">
    <header>
      <p className="label text-xs tracking-[.16em] text-muted">RÔLES ET PÉRIMÈTRES</p>
      <h1 className="font-title mt-2 text-[30px] leading-tight text-foreground sm:text-[36px]">Responsabilités de l’équipe</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Uniquement les personnes disposant d’une responsabilité administrative, ministérielle ou liée à un projet ou une formation.</p>
    </header>

    <form method="get" action={basePath} className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_240px_auto]">
      {isAdminPath && <input type="hidden" name="onglet" value="roles" />}
      <input name="q" defaultValue={q} placeholder="Rechercher une personne ou un périmètre…" className="min-h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/10" />
      <AdminSelect name="categorie" defaultValue={category} ariaLabel="Catégorie" options={[{ value: "toutes", label: "Toutes les catégories" }, { value: "administration", label: "Administration" }, { value: "projects_training", label: "Projets et formations" }, { value: "ministry", label: "Pilotage Ministère" }]} />
      <button type="submit" className="label min-h-11 rounded-md bg-accent px-5 text-xs tracking-[0.12em] text-on-accent">Filtrer</button>
    </form>

    <div className="flex flex-wrap gap-2">{(Object.keys(categories) as Category[]).map((key) => <span key={key} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${categories[key].badge}`}><span className={`h-1.5 w-1.5 rounded-full ${categories[key].dot}`} />{categories[key].label}</span>)}</div>

    {shown.length ? <section className="grid gap-3 xl:grid-cols-2">{shown.map((member) => {
      const rows = rowsByUser.get(member.id) ?? [];
      const avatar = member.avatar_path ? avatarUrls.get(member.avatar_path) : null;
      return <article key={member.id} className="min-w-0 rounded-xl border border-border bg-background p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL Supabase temporaire signée
            <img src={avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
          ) : <span className="font-title flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-base text-foreground">{(member.full_name || "?").charAt(0).toUpperCase()}</span>}
          <div className="min-w-0 flex-1"><h2 className="truncate text-base font-semibold text-foreground">{member.full_name || "Sans nom"}</h2><p className="truncate text-xs text-muted">{member.email}</p></div>
          <Link href={`/gestion/admin/membres/${member.id}?returnTo=${encodeURIComponent(`${basePath}${isAdminPath ? "?onglet=roles" : ""}`)}`} className="text-xs font-medium text-link hover:underline">Voir</Link>
        </div>
        <div className="mt-4 space-y-2">{rows.map((row, index) => <div key={`${row.category}-${row.scope_id ?? "global"}-${row.role_level}-${index}`} className="flex flex-col gap-2 rounded-lg border border-border-soft px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${categories[row.category].dot}`} /><span className="truncate text-sm font-semibold text-foreground">{categories[row.category].label}</span></span>
          <span className="flex flex-wrap items-center gap-1.5 sm:justify-end"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${categories[row.category].badge}`}>{row.role_level}</span>{row.scope_label && <span className="max-w-full truncate rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted">{row.scope_label}</span>}{row.role_level === "Contributeur" && <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.08em] text-muted">{row.can_edit ? "Peut modifier" : "Lecture seule"}</span>}</span>
        </div>)}</div>
        <RoleCommentForm userId={member.id} initialComment={notes.get(member.id) ?? ""} />
        {canManageAccess && <MemberAccessEditor member={member} services={services} ministries={ministries} accessOnly />}
      </article>;
    })}</section> : <section className="rounded-xl border border-border bg-background px-5 py-10 text-center"><UsersRound className="mx-auto text-muted" size={24} /><p className="mt-3 text-sm text-muted">Aucune personne ne correspond à ces critères.</p></section>}

    {canManageAccess && <section className="rounded-xl border border-border bg-background p-4 sm:p-6">
      <div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-1 shrink-0 text-muted" /><div><h2 className="font-title text-[22px] text-foreground">Affecter un contributeur ministériel</h2><p className="mt-1 text-sm text-muted">L’accès est créé en lecture seule. Le responsable ministériel pourra ensuite autoriser la modification.</p></div></div>
      <form action={addDelegate} className="mt-4 grid gap-3 sm:grid-cols-[240px_1fr_auto] sm:items-end"><AdminSelect name="ministry_id" placeholder="Sensibilité…" options={ministries.map((item) => ({ value: item.id, label: item.name }))} searchable /><input type="email" name="email" required placeholder="contributeur@exemple.fr" className="min-h-11 min-w-0 rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" /><button type="submit" className="label min-h-11 rounded-md bg-accent px-4 text-xs tracking-[0.12em] text-on-accent">Donner l’accès</button></form>
      {(delegatesResult.data ?? []).length > 0 && <ul className="mt-5 divide-y divide-border-soft">{(delegatesResult.data ?? []).map((delegate) => <li key={delegate.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{delegate.email} <span className="text-muted">· {ministryName.get(delegate.ministry_id) ?? ""}</span></span><span className="flex items-center gap-3"><span className="label rounded-full bg-surface px-2.5 py-1 text-[10px] tracking-[0.1em] text-muted">{delegate.user_id ? "Compte lié" : "En attente de connexion"}</span><form action={removeDelegate}><input type="hidden" name="delegate_id" value={delegate.id} /><button type="submit" className="text-xs text-link hover:underline">Retirer</button></form></span></li>)}</ul>}
    </section>}
  </div>;
}
