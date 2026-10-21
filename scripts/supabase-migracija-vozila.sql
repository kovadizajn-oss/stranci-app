-- Vozni park: vozila, vozači i zapisi o servisima/popravcima
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
create table if not exists vehicles (
  id                  uuid primary key default gen_random_uuid(),
  marka               text not null,
  model               text,
  registracija        text,
  broj_sasije         text,
  godina              integer,
  lokacija            text,
  status              text not null default 'aktivno' check (status in ('aktivno', 'u_kvaru', 'odjavljeno', 'prodano')),
  istek_registracije  date,
  istek_tehnickog     date,
  istek_osiguranja    date,
  osiguravatelj       text,
  broj_police         text,
  kilometraza         integer,
  napomena            text,
  created_at          timestamptz not null default now()
);
alter table vehicles enable row level security;

create table if not exists vehicle_drivers (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references vehicles(id) on delete cascade,
  employee_id  uuid references employees(id) on delete cascade,
  ime          text,
  created_at   timestamptz not null default now()
);
create index if not exists vehicle_drivers_vehicle_idx on vehicle_drivers(vehicle_id);
alter table vehicle_drivers enable row level security;

create table if not exists vehicle_events (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references vehicles(id) on delete cascade,
  vrsta        text not null default 'servis',
  datum        date,
  opis         text,
  kilometraza  integer,
  trosak       numeric,
  servis       text,
  racun_url    text,
  created_at   timestamptz not null default now()
);
create index if not exists vehicle_events_vehicle_idx on vehicle_events(vehicle_id);
alter table vehicle_events enable row level security;

-- ─── Uvoz postojećih vozila iz tablice (preskače vozila koja već postoje) ───
insert into vehicles (marka, model, registracija, broj_sasije, lokacija, status, istek_registracije, napomena)
select * from (values
  ('Smart', 'City Coupe', 'ZG7051JU', 'WME01MC012H041542', 'Zagreb', 'odjavljeno', null::date, 'U kvaru / prodaja?'),
  ('Citroen', 'C2', 'ZG5513JC', 'VF7JMHFXB97032112', 'Rijeka', 'odjavljeno', null::date, 'Totalka'),
  ('Chevrolet', 'Matiz', 'ZG1689JM', 'KLA0M11CD4C001797', 'Zagreb', 'aktivno', '2027-04-25'::date, null),
  ('Hyundai', 'i30', 'ZG7911HO', 'TMAH2517AJJ059159', 'Zagreb', 'aktivno', null::date, null),
  ('Volkswagen', 'Transporter', 'ZG8912JZ', 'WV2ZZZ70ZXH071204', 'Velika Gorica', 'aktivno', '2026-05-25'::date, null),
  ('Ford', 'Transit', 'ČK837KO', 'WF0SXXTTFSCT26120', 'Velika Gorica', 'aktivno', '2027-04-03'::date, null)
) as v(marka, model, registracija, broj_sasije, lokacija, status, istek_registracije, napomena)
where not exists (select 1 from vehicles x where x.registracija = v.registracija);

insert into vehicle_drivers (vehicle_id, ime)
select x.id, d.ime from (values ('ZG7911HO', 'Ivan'), ('ZG8912JZ', 'Khatri'), ('ZG8912JZ', 'Subash'), ('ČK837KO', 'Khatri'), ('ČK837KO', 'Subash')) as d(reg, ime)
join vehicles x on x.registracija = d.reg
where not exists (select 1 from vehicle_drivers y where y.vehicle_id = x.id and y.ime = d.ime);

insert into vehicle_events (vehicle_id, vrsta, datum, opis)
select x.id, e.vrsta, e.datum::date, e.opis from (values
  ('ZG1689JM', 'popravak', '2026-04-17', null),
  ('ZG7911HO', 'servis', '2026-04-27', 'Ulje i filteri'),
  ('ZG7911HO', 'popravak', '2026-04-27', 'Popravak turbo, DPF'),
  ('ZG8912JZ', 'popravak', '2026-08-14', 'Ponovni popravak motora'),
  ('ČK837KO', 'popravak', '2026-04-27', 'Popravak vrata, kočnice, svjetla')
) as e(reg, vrsta, datum, opis)
join vehicles x on x.registracija = e.reg
where not exists (select 1 from vehicle_events y where y.vehicle_id = x.id and y.vrsta = e.vrsta and y.datum = e.datum::date);
