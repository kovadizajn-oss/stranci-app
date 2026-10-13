-- Datoteka uz godišnji odmor i bolovanje (zahtjev za GO, doznaka liječnika...)
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
alter table vacations   add column if not exists file_url text;
alter table sick_leaves add column if not exists file_url text;
