
alter table sessions add column session_type text not null default 'ministere' check (session_type in ('commun', 'ministere'));
alter table sessions alter column ministry_id drop not null;
alter table sessions add column description text;

insert into sessions (id, ministry_id, teacher_id, session_date, start_time, end_time, location, room, day, session_type, description) values
  ('66666666-6666-6666-6666-666666666666', null, null, '2026-10-03', '09:00', '17:00', 'MLK Grand Paris', null, 'samedi', 'commun', 'Enseignement commun à tous les ministères — plénière le matin, mise en pratique l''après-midi.'),
  ('77777777-7777-7777-7777-777777777777', null, null, '2026-11-07', '09:00', '17:00', 'Giro', null, 'samedi', 'commun', 'Enseignement commun à tous les ministères — plénière le matin, mise en pratique l''après-midi.'),
  ('88888888-8888-8888-8888-888888888888', null, null, '2026-12-05', '09:00', '17:00', 'MLK Grand Paris', null, 'samedi', 'commun', 'Enseignement commun à tous les ministères — plénière le matin, mise en pratique l''après-midi.');
;
