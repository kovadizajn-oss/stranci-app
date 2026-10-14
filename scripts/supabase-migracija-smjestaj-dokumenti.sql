-- Dokumenti smještaja (izvadak iz zemljišne knjige, posjedovni list, ugovor o najmu...)
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
create table if not exists accommodation_documents (
  id                uuid primary key default gen_random_uuid(),
  accommodation_id  uuid not null references accommodations(id) on delete cascade,
  vrsta             text not null default 'ostalo',
  naziv             text,
  datum             date,
  napomena          text,
  url               text not null,
  putanja           text,
  file_name         text,
  created_at        timestamptz not null default now()
);
create index if not exists accommodation_documents_acc_idx on accommodation_documents(accommodation_id);
alter table accommodation_documents enable row level security;
