-- Generiranje obrazaca (npr. Uputnica EP-I): dodatni podaci koji se upisuju u obrasce
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
alter table employees add column if not exists mjesto_rodjenja text;

alter table documents add column if not exists broj_dokumenta text;
alter table documents add column if not exists mjesto_izdavanja text;

alter table companies add column if not exists oib text;
alter table companies add column if not exists adresa text;
alter table companies add column if not exists telefon text;

-- Postavke aplikacije (npr. podaci agencije za obrasce)
create table if not exists postavke (
  kljuc       text primary key,
  vrijednost  jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table postavke enable row level security;
