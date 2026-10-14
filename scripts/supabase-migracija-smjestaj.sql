-- Smještaj radnika + tko je u kojem smještaju
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
create table if not exists accommodations (
  id                  uuid primary key default gen_random_uuid(),
  naziv               text not null,
  adresa              text,
  grad                text,
  povrsina_m2         numeric,
  broj_soba           integer,
  kapacitet           integer,          -- za sada ručno; kasnije izračun iz m² prema propisu
  najmodavac          text,
  najmodavac_kontakt  text,
  napomena            text,
  created_at          timestamptz not null default now()
);

create table if not exists accommodation_residents (
  id                uuid primary key default gen_random_uuid(),
  accommodation_id  uuid not null references accommodations(id) on delete cascade,
  employee_id       uuid not null references employees(id) on delete cascade,
  datum_od          date not null default current_date,
  datum_do          date,               -- prazno = još živi tamo
  ugovor_url        text,               -- potpisani ugovor o smještaju
  napomena          text,
  created_at        timestamptz not null default now()
);
create index if not exists accommodation_residents_acc_idx on accommodation_residents(accommodation_id);
create index if not exists accommodation_residents_emp_idx on accommodation_residents(employee_id);

alter table accommodations          enable row level security;
alter table accommodation_residents enable row level security;
