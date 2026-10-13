-- Više kontakt osoba po tvrtki
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
create table if not exists company_contacts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  ime         text not null,
  uloga       text,
  telefon     text,
  email       text,
  napomena    text,
  created_at  timestamptz not null default now()
);
create index if not exists company_contacts_company_id_idx on company_contacts(company_id);

-- Isto kao ostale tablice: RLS uključen, pristup samo preko server API-ja (service role)
alter table company_contacts enable row level security;

-- Prebaci postojeće kontakte iz tablice companies (samo ako još nisu prebačeni)
insert into company_contacts (company_id, ime, telefon, email)
select c.id, coalesce(nullif(trim(c.kontakt_ime), ''), 'Kontakt'), nullif(trim(c.kontakt_telefon), ''), nullif(trim(c.kontakt_email), '')
from companies c
where (coalesce(trim(c.kontakt_ime), '') <> '' or coalesce(trim(c.kontakt_telefon), '') <> '' or coalesce(trim(c.kontakt_email), '') <> '')
  and not exists (select 1 from company_contacts cc where cc.company_id = c.id);
