-- Vrsta zaposlenja: ustupanje (agencija) ili izravno zaposlenje kod tvrtke
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
alter table employees add column if not exists vrsta_zaposlenja text
  check (vrsta_zaposlenja in ('ustupanje', 'izravno'));
alter table employees add column if not exists ustupanje_od date;
alter table employees add column if not exists ustupanje_do date;

-- Uvezeni INTERCARS radnici (ILS Adriatic Logistika) su na ustupanju.
-- Vrijeme ustupanja = rok dozvole za boravak i rad (dokument "Radna dozvola").
update employees e
set vrsta_zaposlenja = 'ustupanje',
    ustupanje_od = d.datum_izdavanja,
    ustupanje_do = d.datum_isteka
from (
  select distinct on (employee_id) employee_id, datum_izdavanja, datum_isteka
  from documents
  where naziv = 'Radna dozvola'
  order by employee_id, datum_isteka desc nulls last
) d
where d.employee_id = e.id
  and e.vrsta_zaposlenja is null
  and e.poslodavac ilike '%ILS Adriatic%';
