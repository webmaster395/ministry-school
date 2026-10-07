-- Le journal temporaire de diagnostic du crash SSR n'est plus nécessaire.
drop table if exists public.server_render_diagnostics;
