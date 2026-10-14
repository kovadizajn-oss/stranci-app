-- Sobe u smještaju + u kojoj sobi je radnik
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
create table if not exists accommodation_rooms (
  id                uuid primary key default gen_random_uuid(),
  accommodation_id  uuid not null references accommodations(id) on delete cascade,
  naziv             text not null,
  broj_kreveta      integer not null default 1,
  povrsina_m2       numeric,
  napomena          text,
  created_at        timestamptz not null default now()
);
create index if not exists accommodation_rooms_acc_idx on accommodation_rooms(accommodation_id);
alter table accommodation_rooms enable row level security;

alter table accommodation_residents add column if not exists room_id uuid references accommodation_rooms(id) on delete set null;
