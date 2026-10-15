-- Kretanje radnika: gdje je radio prije i gdje ide (prijava za novog poslodavca).
-- Trenutni posao ostaje u tablici employees; ovdje su prijašnji i planirani.
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
create table if not exists employee_assignments (
  id                 uuid primary key default gen_random_uuid(),
  employee_id        uuid not null references employees(id) on delete cascade,
  faza               text not null check (faza in ('prijasnje', 'planirano')),
  company_id         uuid references companies(id) on delete set null,
  poslodavac         text,
  vrsta_zaposlenja   text check (vrsta_zaposlenja in ('ustupanje', 'izravno')),
  radno_mjesto       text,
  datum_od           date,
  datum_do           date,
  status_prijave     text check (status_prijave in ('priprema', 'predano', 'odobreno', 'odbijeno')),
  datum_prijave      date,
  napomena           text,
  created_at         timestamptz not null default now()
);
create index if not exists employee_assignments_emp_idx on employee_assignments(employee_id);
alter table employee_assignments enable row level security;
