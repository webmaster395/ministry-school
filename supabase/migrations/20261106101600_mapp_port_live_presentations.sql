-- Generated from Profil MAPP 202610100002_live_presentations.sql.
-- Do not edit this generated file; update the source migration or transformer.
create table mapp.live_presentations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references mapp.assessment_sessions(id) on delete restrict,
  public_code text not null unique,
  title text not null,
  state text not null default 'prepared' check (state in ('prepared','open','ended')),
  display_mode text not null default 'distribution' check (display_mode in ('distribution','averages','qr')),
  is_paused boolean not null default false,
  is_hidden boolean not null default false,
  frozen_snapshot jsonb,
  opened_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mapp.live_presentations enable row level security;
revoke all on mapp.live_presentations from anon, authenticated;
comment on table mapp.live_presentations is 'Admin-only live event controls. Public projection data is exposed solely through an authenticated aggregate endpoint.';
