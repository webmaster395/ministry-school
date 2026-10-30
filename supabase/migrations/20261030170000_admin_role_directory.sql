begin;

-- Notes internes rattachées à une personne. Elles ne sont jamais exposées aux
-- espaces étudiants et restent réservées aux comptes administratifs.
create table if not exists public.admin_member_role_notes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  comment text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_member_role_notes enable row level security;

drop policy if exists admin_member_role_notes_read on public.admin_member_role_notes;
create policy admin_member_role_notes_read
on public.admin_member_role_notes for select to authenticated
using (public.is_platform_admin());

drop policy if exists admin_member_role_notes_write on public.admin_member_role_notes;
create policy admin_member_role_notes_write
on public.admin_member_role_notes for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin() and updated_by = auth.uid());

-- Vue applicative compacte : une ligne par responsabilité et périmètre. La
-- fonction n'expose pas la notion de super administrateur, volontairement.
create or replace function public.admin_role_directory()
returns table (
  user_id uuid,
  category text,
  role_level text,
  scope_id uuid,
  scope_label text,
  can_edit boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select p.id, 'administration'::text, 'Administrateur'::text,
         null::uuid, null::text, true
  from public.profiles p
  where p.role = 'admin'

  union all

  select a.user_id, 'projects_training'::text,
         case when a.responsibility = 'manager' then 'Responsable' else 'Contributeur' end,
         o.id, o.title, coalesce(a.can_edit, a.responsibility = 'manager')
  from public.opportunity_assignments a
  join public.opportunities o on o.id = a.opportunity_id

  union all

  select p.id, 'projects_training'::text, 'Responsable habilité'::text,
         null::uuid, 'Création autonome'::text, true
  from public.profiles p
  where coalesce(p.can_create_opportunities, false)
    and not exists (
      select 1 from public.opportunity_assignments a where a.user_id = p.id
    )

  union all

  select p.id, 'ministry'::text, 'Responsable'::text,
         m.id, m.name, true
  from public.profiles p
  join public.ministries m on m.id = p.ministry_lead_of

  union all

  select d.user_id, 'ministry'::text, 'Contributeur'::text,
         m.id, m.name, coalesce(d.can_edit, false)
  from public.ministry_delegates d
  join public.ministries m on m.id = d.ministry_id
  where d.user_id is not null;
end
$$;

revoke all on function public.admin_role_directory() from public;
grant execute on function public.admin_role_directory() to authenticated;
grant select, insert, update, delete on public.admin_member_role_notes to authenticated;

commit;
