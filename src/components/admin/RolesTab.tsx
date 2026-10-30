import Link from "next/link";
import { History, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import { getMinistries } from "@/lib/data/admin";
import { getOpportunities, getServices } from "@/lib/data/opportunities";
import { signedAvatarUrls } from "@/lib/avatars";
import AdminSelect from "@/components/admin/AdminSelect";
import MemberAccessEditor from "@/components/admin/MemberAccessEditor";
import RoleCommentForm from "@/components/admin/RoleCommentForm";
import RoleAssignmentForm from "@/components/admin/RoleAssignmentForm";
import RemoveRoleButton from "@/components/admin/RemoveRoleButton";
import { toggleMemberRoleAccess } from "@/app/gestion/admin/actions";

type Category = "administration" | "projects_training" | "ministry";
type DirectoryRow = { user_id: string; category: Category; role_level: string; role_key: string; scope_id: string | null; scope_label: string | null; can_edit: boolean; assignment_id: string | null };
type Note = { user_id: string; comment: string };
type Audit = { id: string; target_user_id: string; actor_user_id: string | null; role_key: string; action: string; created_at: string };

const categories: Record<Category, { label: string; badge: string; dot: string }> = {
  administration: { label: "Administration", badge: "border-[#d9dfdc] bg-[#f1f3f2] text-foreground", dot: "bg-[#69746f]" },
  projects_training: { label: "Projets et formations", badge: "border-[#f3d9ac] bg-[#fff5e4] text-[#8b5708]", dot: "bg-[#e89b20]" },
  ministry: { label: "Pilotage Ministère", badge: "border-[#d7e3bb] bg-[#f2f7e6] text-[#52662c]", dot: "bg-[#91a956]" },
};

const plain = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("fr-FR");

export default async function RolesTab({ q, category, canManageAccess, basePath }: { q: string; category: string; canManageAccess: boolean; basePath: string }) {
  const supabase = await createClient();
  const [members, ministries, services, opportunities, directoryResult, notesResult, auditResult] = await Promise.all([
    getMembers(supabase),
    getMinistries(supabase),
    getServices(supabase),
    getOpportunities(supabase),
    supabase.rpc("admin_role_directory"),
    supabase.from("admin_member_role_notes").select("user_id, comment"),
    supabase.from("admin_role_audit").select("id, target_user_id, actor_user_id, role_key, action, created_at").order("created_at", { ascending: false }).limit(12),
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
  const memberName = new Map(members.map((item) => [item.id, item.full_name]));
  const audits = (auditResult.data ?? []) as Audit[];
  const isAdminPath = basePath === "/gestion/admin";

  return <div className="space-y-5">
    <header>
      <p className="label text-xs tracking-[.16em] text-muted">PERMISSIONS</p>
      <h1 className="font-title mt-2 text-[30px] leading-tight text-foreground sm:text-[36px]">Rôles et périmètres</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">Uniquement les personnes disposant d’une responsabilité administrative, ministérielle ou liée à un projet ou une formation.</p>
    </header>

    <form method="get" action={basePath} className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_240px_auto]">
      {isAdminPath && <input type="hidden" name="onglet" value="permissions" />}
      <input name="q" defaultValue={q} placeholder="Rechercher une personne ou un périmètre…" className="min-h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/10" />
      <AdminSelect name="categorie" defaultValue={category} ariaLabel="Catégorie" options={[{ value: "toutes", label: "Toutes les catégories" }, { value: "administration", label: "Administration" }, { value: "projects_training", label: "Projets et formations" }, { value: "ministry", label: "Pilotage Ministère" }]} />
      <button type="submit" className="label min-h-11 rounded-md bg-accent px-5 text-xs tracking-[0.12em] text-on-accent">Filtrer</button>
    </form>

    <div className="flex flex-wrap gap-2">{(Object.keys(categories) as Category[]).map((key) => <span key={key} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${categories[key].badge}`}><span className={`h-1.5 w-1.5 rounded-full ${categories[key].dot}`} />{categories[key].label}</span>)}</div>

    {canManageAccess && <RoleAssignmentForm members={members.filter((item) => !item.deactivated).map((item) => ({ id: item.id, label: `${item.full_name} · ${item.email}` }))} ministries={ministries.map((item) => ({ id: item.id, label: item.name }))} opportunities={opportunities.map((item) => ({ id: item.id, label: item.title }))} />}

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
          <Link href={`/gestion/admin/membres/${member.id}?returnTo=${encodeURIComponent(`${basePath}${isAdminPath ? "?onglet=permissions" : ""}`)}`} className="text-xs font-medium text-link hover:underline">Voir</Link>
        </div>
        <div className="mt-4 space-y-2">{rows.map((row, index) => <div key={`${row.category}-${row.scope_id ?? "global"}-${row.role_level}-${index}`} className="flex flex-col gap-2 rounded-lg border border-border-soft px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${categories[row.category].dot}`} /><span className="truncate text-sm font-semibold text-foreground">{categories[row.category].label}</span></span>
          <span className="flex flex-wrap items-center gap-1.5 sm:justify-end"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${categories[row.category].badge}`}>{row.role_level}</span>{row.scope_label && <span className="max-w-full truncate rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted">{row.scope_label}</span>}{row.role_level === "Contributeur" && canManageAccess && <form action={toggleMemberRoleAccess}><input type="hidden" name="user_id" value={member.id} /><input type="hidden" name="role_key" value={row.role_key} /><input type="hidden" name="scope_id" value={row.scope_id ?? ""} /><input type="hidden" name="can_edit" value={row.can_edit ? "" : "on"} /><button type="submit" className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.08em] text-muted hover:text-foreground">{row.can_edit ? "Peut modifier" : "Lecture seule"}</button></form>}{canManageAccess && <RemoveRoleButton userId={member.id} roleKey={row.role_key} scopeId={row.scope_id} label={`${row.role_level}${row.scope_label ? ` · ${row.scope_label}` : ""}`} />}</span>
        </div>)}</div>
        <RoleCommentForm userId={member.id} initialComment={notes.get(member.id) ?? ""} />
        {canManageAccess && <MemberAccessEditor member={member} services={services} ministries={ministries} accessOnly />}
      </article>;
    })}</section> : <section className="rounded-xl border border-border bg-background px-5 py-10 text-center"><UsersRound className="mx-auto text-muted" size={24} /><p className="mt-3 text-sm text-muted">Aucune personne ne correspond à ces critères.</p></section>}

    {audits.length > 0 && <details className="rounded-xl border border-border bg-background p-4 sm:p-5"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-foreground"><History size={17} /> Historique des changements</summary><ul className="mt-4 divide-y divide-border-soft">{audits.map((audit) => <li key={audit.id} className="grid gap-1 py-3 text-xs sm:grid-cols-[1fr_auto]"><span><strong>{memberName.get(audit.actor_user_id ?? "") ?? "Système"}</strong> · {audit.action === "removed" ? "Retrait" : audit.action === "updated" ? "Modification" : "Attribution"} · {audit.role_key} · {memberName.get(audit.target_user_id) ?? "Membre"}</span><time className="text-muted">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(audit.created_at))}</time></li>)}</ul></details>}
  </div>;
}
