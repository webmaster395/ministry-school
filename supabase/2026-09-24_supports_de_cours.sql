-- Dépôt de fichiers (PDF, PowerPoint, Word, Excel…) comme supports de cours.
-- À exécuter dans Supabase > SQL Editor.
-- Les fichiers sont lisibles par lien (noms non devinables) ; seuls les comptes connectés peuvent en déposer.

insert into storage.buckets (id, name, public, file_size_limit)
values ('supports-cours', 'supports-cours', true, 20971520)
on conflict (id) do update set public = true, file_size_limit = 20971520;

drop policy if exists "supports_cours_depot" on storage.objects;
create policy "supports_cours_depot" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'supports-cours');

-- Pour annuler :
--   drop policy if exists "supports_cours_depot" on storage.objects;
--   delete from storage.buckets where id = 'supports-cours';

-- Type de ressource (présentation, vidéo, lecture…), choisi à l'ajout d'un support.
-- Après exécution, ajouter MATERIALS_HAVE_TYPE=1 dans les variables d'environnement (Vercel et .env.local).
alter table public.materials add column if not exists resource_type text;
--   (pour annuler : alter table public.materials drop column if exists resource_type;)
