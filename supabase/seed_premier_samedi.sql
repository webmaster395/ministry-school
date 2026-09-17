-- =============================================================================
-- Séance Tronc Commun : Ce Samedi 19 septembre 2026
-- Intervenant : Paul Goulet
-- Thème       : Le caractère
-- Lieu        : MLK 2 (= MLK Studio)
-- Type        : commun
-- =============================================================================
--
-- ⚠️  RAPPEL — LIEUX :
--
--   • MLK 2 = MLK Studio (utilisé pour ce samedi 19 septembre ainsi que pour
--     la Phase 2 cours par ministère).
--     Site unique : pas de sous-salle, laisser `room` vide ou NULL.
--
--   • Espace Grand Paris (utilisé pour les autres week-ends de tronc commun).
--     Plusieurs salles : Giroud | Rosa Parks | Denis.
--
-- =============================================================================

-- Si une session existait déjà pour ce samedi 19 (ex: ancienne formation Ivan), on la met à jour
-- Sinon on l'insère.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM sessions WHERE session_date = '2026-09-19' AND session_type = 'commun') THEN
    UPDATE sessions
    SET
      location = 'MLK 2 (MLK Studio)',
      room = NULL,
      start_time = '09:30:00',
      end_time = '17:00:00',
      day = 'samedi',
      description = 'Paul Goulet — Le caractère (Tronc commun : plénière le matin, mise en pratique l''après-midi)'
    WHERE session_date = '2026-09-19' AND session_type = 'commun';
  ELSE
    INSERT INTO sessions (
      session_type,
      session_date,
      day,
      start_time,
      end_time,
      location,
      room,
      description
    ) VALUES (
      'commun',
      '2026-09-19',
      'samedi',
      '09:30:00',
      '17:00:00',
      'MLK 2 (MLK Studio)',
      NULL,
      'Paul Goulet — Le caractère (Tronc commun : plénière le matin, mise en pratique l''après-midi)'
    );
  END IF;
END $$;
