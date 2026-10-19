-- Obrasci, 2. dio: dodatni podaci radnika, tvrtki i agencije
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
alter table employees add column if not exists drzavljanstvo text;
alter table employees add column if not exists adresa_domovina text;
alter table employees add column if not exists strucna_sprema text;

alter table companies add column if not exists email text;
alter table companies add column if not exists iban text;
alter table companies add column if not exists direktor text;

-- Direktor agencije (iz ugovora / popisa za liječnički)
insert into postavke (kljuc, vrijednost)
values ('agencija', '{"direktor": "Ivan Dodig", "direktor_oib": "10323624932"}')
on conflict (kljuc) do update
set vrijednost = postavke.vrijednost || excluded.vrijednost, updated_at = now();
