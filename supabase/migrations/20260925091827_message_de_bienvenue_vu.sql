alter table public.profiles add column if not exists welcome_seen_at timestamptz;

-- Les comptes déjà créés ne revoient pas le message de bienvenue : seuls les nouveaux inscrits (colonne vide) le verront.
update public.profiles set welcome_seen_at = now() where welcome_seen_at is null;;
