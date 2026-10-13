-- Obaveze vezane uz tvrtku (uz postojeće obaveze vezane uz radnika)
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
alter table obaveze add column if not exists company_id uuid references companies(id) on delete set null;
create index if not exists obaveze_company_id_idx on obaveze(company_id);
