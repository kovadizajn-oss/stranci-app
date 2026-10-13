-- Vrsta zaposlenja: ustupanje (agencija) ili izravno zaposlenje kod tvrtke
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
alter table employees add column if not exists vrsta_zaposlenja text
  check (vrsta_zaposlenja in ('ustupanje', 'izravno'));
alter table employees add column if not exists ustupanje_od date;
alter table employees add column if not exists ustupanje_do date;

-- Uvezeni INTERCARS radnici (ILS Adriatic Logistika) su na ustupanju, na neodređeno (bez datuma).
update employees
set vrsta_zaposlenja = 'ustupanje'
where vrsta_zaposlenja is null
  and poslodavac ilike '%ILS Adriatic%';
