-- Linkovi po tvrtki (portal, dijeljena mapa, ugovor, web...)
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
create table if not exists company_links (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  naziv       text not null,
  url         text not null,
  created_at  timestamptz not null default now()
);
create index if not exists company_links_company_id_idx on company_links(company_id);
alter table company_links enable row level security;
