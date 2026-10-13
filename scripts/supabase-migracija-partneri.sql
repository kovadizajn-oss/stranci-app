-- Partnerske agencije (+ kontakt osobe i linkovi)
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
create table if not exists partner_agencies (
  id          uuid primary key default gen_random_uuid(),
  naziv       text not null,
  drzava      text,
  grad        text,
  adresa      text,
  oib         text,
  web         text,
  email       text,
  telefon     text,
  usluge      text,
  napomena    text,
  created_at  timestamptz not null default now()
);

create table if not exists partner_contacts (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partner_agencies(id) on delete cascade,
  ime         text not null,
  uloga       text,
  telefon     text,
  email       text,
  napomena    text,
  created_at  timestamptz not null default now()
);
create index if not exists partner_contacts_partner_id_idx on partner_contacts(partner_id);

create table if not exists partner_links (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partner_agencies(id) on delete cascade,
  naziv       text not null,
  url         text not null,
  created_at  timestamptz not null default now()
);
create index if not exists partner_links_partner_id_idx on partner_links(partner_id);

alter table partner_agencies enable row level security;
alter table partner_contacts enable row level security;
alter table partner_links    enable row level security;
