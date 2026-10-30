begin;

alter table public.opportunity_resources
  add column if not exists description text;

comment on column public.opportunity_resources.description is
  'Description publique facultative du support, de la ressource ou du lien.';

alter table public.opportunity_resources
  drop constraint if exists opportunity_resources_description_length;

alter table public.opportunity_resources
  add constraint opportunity_resources_description_length
  check (description is null or char_length(description) <= 2000);

commit;
