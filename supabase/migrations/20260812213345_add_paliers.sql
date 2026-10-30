
create table paliers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_date date not null,
  end_date date not null,
  description text,
  sort_order int not null,
  is_defined boolean not null default true
);

insert into paliers (label, start_date, end_date, description, sort_order, is_defined) values
  ('Palier 1', '2027-01-01', '2027-03-31', 'Premier palier de formation par ministère, à MLK Studio.', 1, true),
  ('Palier 2', '2027-04-01', '2027-06-30', 'Palier suivant — contenu et dates encore à confirmer par l''équipe pédagogique.', 2, false);

alter table paliers enable row level security;

create policy "paliers readable by authenticated" on paliers
  for select to authenticated using (true);
;
