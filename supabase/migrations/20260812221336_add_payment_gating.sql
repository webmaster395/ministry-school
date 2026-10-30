
alter table profiles add column has_paid boolean not null default false;

-- le compte étudiant de démo existant reste payé pour ne pas casser la démo actuelle
update profiles set has_paid = true where id = '22222222-2222-2222-2222-222222222222';

-- enseignants et admin ne sont pas concernés par le paiement
update profiles set has_paid = true where role in ('teacher', 'admin');
;
