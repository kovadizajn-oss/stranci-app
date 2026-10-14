-- Vraća adresu smještaja (iz uvoza) radnicima koji su bili useljeni u neki smještaj
-- Pokreni jednom u Supabase: SQL Editor -> New query -> zalijepi -> Run
update employees e
set adresa_smjestaja = v.adresa
from (values
  ('30041836407', 'Stara cesta 26, 10419 Vukovina'),
  ('96728310158', null),
  ('52279314571', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('55856344791', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('25644528460', 'Stara cesta 26, 10419 Vukovina'),
  ('94927392565', 'Stara cesta 26, 10419 Vukovina'),
  ('35822651501', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('37288028191', 'Stara cesta 26, 10419 Vukovina'),
  ('63696183030', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('30644655546', null),
  ('49395571807', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('16925508152', 'Stara cesta 26, 10419 Vukovina'),
  ('97411753106', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('06410709111', 'Stara cesta 26, 10419 Vukovina'),
  ('02528496317', null),
  ('18420847399', 'Stara cesta 26, 10419 Vukovina'),
  ('80656958877', 'Stara cesta 26, 10419 Vukovina'),
  ('28801339582', 'Stara cesta 26, 10419 Vukovina'),
  ('93767681630', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('38704397416', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('14696955639', 'Stara cesta 26, 10419 Vukovina'),
  ('34984628493', 'Stara cesta 26, 10419 Vukovina'),
  ('47296290265', 'Stara cesta 26, 10419 Vukovina'),
  ('76262924470', null),
  ('37846107438', 'Stara cesta 26, 10419 Vukovina'),
  ('00290963184', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('57695926336', null),
  ('75446042240', 'Stara cesta 26, 10419 Vukovina'),
  ('84388993318', 'Juraja i Vjekoslava Stančića 4, 10419 Vukovina'),
  ('06718747948', 'Stara cesta 26, 10419 Vukovina')
) as v(oib, adresa)
where e.oib = v.oib
  and e.id in (select employee_id from accommodation_residents);
