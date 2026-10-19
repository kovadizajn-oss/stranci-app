/**
 * AI ekstrakcija podataka iz dokumenata radnika — Claude API (Anthropic).
 *
 * Zamjenjuje raniji Gemini poziv. Ne treba nikakav dodatni npm paket:
 * poziva Claude API izravno preko fetch-a.
 *
 * Potrebna environment varijabla (u .env.local I u Vercel → Settings → Environment Variables):
 *   ANTHROPIC_API_KEY=sk-ant-...
 *
 * Redoslijed modela:
 *   1. Claude Sonnet 5.5  — glavni model (najbolji omjer točnosti i brzine)
 *   2. Claude Sonnet 5.5  — još jedan pokušaj nakon kratke pauze, ako je API bio preopterećen
 *   3. Claude Haiku 4.5   — rezerva (brži i jeftiniji) ako Sonnet i dalje ne odgovara
 */

// ─────────────────────────────────────────────────────────────
// Postavke
// ─────────────────────────────────────────────────────────────

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

const SONNET = "claude-sonnet-5-5";
const HAIKU = "claude-haiku-4-5-20251001";

/**
 * Koliko se Sonnet "trudi". "low" je najbrže i dovoljno za čitanje dokumenata.
 * Ako primijetiš da griješi u čitanju, promijeni u "medium" (sporije, malo skuplje).
 */
const SONNET_EFFORT: "low" | "medium" | "high" = "low";

/**
 * Maksimalna ukupna veličina datoteka po zahtjevu. Vercel ionako odbija sve iznad 4.5 MB,
 * a stranice /uvoz i /[id] same ograničavaju na 3.5 MB. Grupni uvoz šalje do 10 datoteka odjednom.
 */
export const MAX_UKUPNO_BAJTOVA = 4.4 * 1024 * 1024;

/** Ukupno vrijeme koje dajemo AI-u (ruta ima maxDuration = 60 s). */
const VREMENSKI_BUDZET_MS = 55_000;

// ─────────────────────────────────────────────────────────────
// Vrste dokumenata i tipovi
// ─────────────────────────────────────────────────────────────

export const VRSTE_DOKUMENATA = [
  "Osobna iskaznica",
  "Putovnica",
  "Vozačka dozvola",
  "Boravišna dozvola",
  "Radna dozvola",
  "Liječnički pregled",
  "Ugovor o radu",
  "Potvrda o boravku",
] as const;

export type VrstaDokumenta = (typeof VRSTE_DOKUMENATA)[number];
export type KategorijaDokumenta = "osobni" | "prateci";

const KATEGORIJA_PO_VRSTI: Record<VrstaDokumenta, KategorijaDokumenta> = {
  "Osobna iskaznica": "osobni",
  Putovnica: "osobni",
  "Vozačka dozvola": "osobni",
  "Boravišna dozvola": "osobni",
  "Radna dozvola": "prateci",
  "Liječnički pregled": "prateci",
  "Ugovor o radu": "prateci",
  "Potvrda o boravku": "prateci",
};

export interface IzvuceniDokument {
  dokument_naziv: VrstaDokumenta;
  kategorija: KategorijaDokumenta;
  dokument_vrijedi_do: string | null; // YYYY-MM-DD
  datum_izdavanja: string | null; // YYYY-MM-DD
  broj_dokumenta: string | null;
  mjesto_izdavanja: string | null;
  /** Indeks poslane datoteke iz koje je dokument (0 = prva). Koriste ga /uvoz i /bulk-uvoz za upload slike. */
  file_index: number | null;
}

/** Isti oblik kao što je vraćao Gemini — frontend se ne mora mijenjati. */
export interface IzvuceniRadnik {
  ime: string | null;
  prezime: string | null;
  datum_rodjenja: string | null;
  drzava_rodjenja: string | null;
  oib: string | null;
  ime_oca: string | null;
  mjesto_rodjenja: string | null;
  poslodavac: string | null;
  radno_mjesto: string | null;
  dokumenti: IzvuceniDokument[];
}

/** Greška s porukom na hrvatskom koju je sigurno prikazati korisniku. */
export class GreskaEkstrakcije extends Error {
  constructor(
    message: string,
    public status: number = 500,
  ) {
    super(message);
    this.name = "GreskaEkstrakcije";
  }
}

// ─────────────────────────────────────────────────────────────
// Javne funkcije (koriste ih API rute)
// ─────────────────────────────────────────────────────────────

export interface PripremljenaDatoteka {
  naziv: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";
  base64: string;
}

/**
 * Čita datoteke iz FormData (polje "files", a za svaki slučaj i "file"),
 * provjerava format i ukupnu veličinu te ih pretvara u base64.
 */
export async function procitajDatotekeIzForme(formData: FormData): Promise<PripremljenaDatoteka[]> {
  const unosi = [...formData.getAll("files"), ...formData.getAll("file")];
  const datoteke = unosi.filter((u): u is File => typeof u !== "string" && u.size > 0);

  if (datoteke.length === 0) {
    throw new GreskaEkstrakcije("Nije priložena nijedna datoteka.", 400);
  }

  const ukupno = datoteke.reduce((zbroj, d) => zbroj + d.size, 0);
  if (ukupno > MAX_UKUPNO_BAJTOVA) {
    throw new GreskaEkstrakcije(
      `Datoteke su prevelike (${(ukupno / 1024 / 1024).toFixed(1)} MB). Najviše je oko 4 MB po slanju — pošalji manje datoteka odjednom ili smanji slike.`,
      413,
    );
  }

  const rezultat: PripremljenaDatoteka[] = [];
  for (const datoteka of datoteke) {
    const bajtovi = new Uint8Array(await datoteka.arrayBuffer());
    const mediaType = prepoznajFormat(bajtovi);
    if (!mediaType) {
      throw new GreskaEkstrakcije(
        `Format datoteke "${datoteka.name}" nije podržan. Podržani su JPG, PNG, WEBP, GIF i PDF. (iPhone HEIC slike spremi kao JPG ili napravi screenshot.)`,
        415,
      );
    }
    rezultat.push({
      naziv: datoteka.name || "datoteka",
      mediaType,
      base64: Buffer.from(bajtovi).toString("base64"),
    });
  }
  return rezultat;
}

/** Jedan radnik iz jedne ili više datoteka (putovnica + DBR + ugovor…). */
export async function izvuciRadnika(datoteke: PripremljenaDatoteka[]): Promise<IzvuceniRadnik> {
  const sadrzaj = [
    ...blokoviDatoteka(datoteke),
    {
      type: "text",
      text:
        "Sve priložene datoteke pripadaju JEDNOJ osobi. Izvuci njezine podatke i popis dokumenata. " +
        "Ako se podaci u dokumentima razlikuju, prednost ima putovnica.",
    },
  ];

  const sirovo = await pozoviClaude({
    sadrzaj,
    schema: RADNIK_SCHEMA,
    maxTokens: 2_000,
  });

  return normalizirajRadnika(sirovo, datoteke.length);
}

/** Više radnika iz više datoteka — AI sam grupira datoteke po osobi. */
export async function izvuciViseRadnika(datoteke: PripremljenaDatoteka[]): Promise<IzvuceniRadnik[]> {
  const sadrzaj = [
    ...blokoviDatoteka(datoteke),
    {
      type: "text",
      text:
        `Priloženo je ${datoteke.length} datoteka koje mogu pripadati RAZLIČITIM osobama. ` +
        "Grupiraj ih po osobi: jedna osoba = jedan zapis u \"radnici\". " +
        "Istu osobu prepoznaj po imenu, prezimenu i datumu rođenja — imena se mogu malo razlikovati u transliteraciji " +
        "između putovnice i hrvatskog dokumenta. Svaka datoteka pripada točno jednoj osobi. " +
        "Svaki dokument navedi samo kod osobe kojoj pripada.",
    },
  ];

  const sirovo = await pozoviClaude({
    sadrzaj,
    schema: BULK_SCHEMA,
    maxTokens: Math.min(16_000, 1_500 + datoteke.length * 700),
  });

  const radnici = Array.isArray((sirovo as { radnici?: unknown })?.radnici)
    ? ((sirovo as { radnici: unknown[] }).radnici)
    : [];

  return radnici
    .map((r) => normalizirajRadnika(r, datoteke.length))
    .filter((r) => r.ime || r.prezime || r.dokumenti.length > 0);
}

/** Pretvara bilo koju grešku u JSON odgovor za frontend: { error: "..." }. */
export function odgovorNaGresku(err: unknown): Response {
  if (err instanceof GreskaEkstrakcije) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error("[extract] Neočekivana greška:", err);
  return Response.json(
    { error: "Skeniranje dokumenta nije uspjelo. Pokušaj ponovno ili unesi podatke ručno." },
    { status: 500 },
  );
}

// ─────────────────────────────────────────────────────────────
// Upute za AI (prompt)
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ti si sustav za čitanje osobnih i radnih dokumenata stranih radnika za hrvatsku agenciju za zapošljavanje. Iz priloženih slika i PDF-ova izvlačiš podatke za profil radnika.

OPĆA PRAVILA
- Prepiši samo ono što je stvarno vidljivo u dokumentu. Ako podatak nije vidljiv, nije čitljiv ili nisi siguran, vrati null. Nikad ne izmišljaj i ne nagađaj.
- Svi datumi u formatu YYYY-MM-DD. Pazi na redoslijed dana i mjeseca: hrvatski i europski dokumenti pišu DD.MM.YYYY, a strojno čitljiva zona (MRZ) piše YYMMDD.
- Ako dokument ima MRZ (retci sa znakovima <<<), koristi ga za provjeru datuma rođenja, datuma isteka i toga što je ime, a što prezime. Za pravopis imena prednost ima vizualni dio dokumenta (latinica, s dijakritičkim znakovima ako ih ima).
- Tekst na nelatiničnim pismima (ćirilica, devanagari, arapsko pismo…) ne prepisuj — koristi latinični zapis iz istog dokumenta.
- Imena i prezimena prepiši onako kako pišu u dokumentu.

POLJA RADNIKA
- ime: osobno ime ili imena (Given names). Srednja imena idu u ime.
- prezime: prezime (Surname). Ako dokument ima samo jedno ime bez prezimena, stavi ga u ime, a prezime je null.
- datum_rodjenja: datum rođenja.
- mjesto_rodjenja: mjesto (grad) rođenja, ako je navedeno (Place of birth). Samo mjesto, bez države.
- drzava_rodjenja: država rođenja, naziv na hrvatskom jeziku (npr. Nepal, Indija, Filipini, Bangladeš, Šri Lanka, Uzbekistan, Bosna i Hercegovina, Srbija, Sjeverna Makedonija). Ako dokument navodi samo grad ili okrug rođenja, upiši državu kojoj on pripada; ako ni to nije jasno, upiši državu koja je izdala putovnicu.
- oib: hrvatski osobni identifikacijski broj, točno 11 znamenki. Obično je na hrvatskoj boravišnoj dozvoli, rješenju MUP-a ili ugovoru o radu. Nikad ne upisuj broj putovnice ili broj dokumenta kao OIB.
- ime_oca: samo ako je izričito navedeno (npr. "Father's name", "Name of father", "Ime oca").
- poslodavac: naziv tvrtke poslodavca, ako je naveden (ugovor o radu, dozvola za boravak i rad).
- radno_mjesto: zanimanje ili radno mjesto, ako je navedeno.

DOKUMENTI
Za svaki prepoznati dokument dodaj jedan zapis u "dokumenti". Prednja i stražnja strana istog dokumenta su JEDAN dokument. Vrste:
- "Putovnica" — putovnica (Passport).
- "Osobna iskaznica" — nacionalna osobna iskaznica (ID card).
- "Vozačka dozvola" — vozačka dozvola (Driving licence).
- "Boravišna dozvola" — hrvatska biometrijska kartica "Dozvola boravka" (uključujući karticu s napomenom "dozvola za boravak i rad") ili druga boravišna dozvola.
- "Radna dozvola" — papirnato rješenje ili odobrenje MUP-a o dozvoli za boravak i rad, odnosno radna dozvola (Work permit).
- "Liječnički pregled" — liječničko uvjerenje (Medical certificate).
- "Ugovor o radu" — ugovor o radu (Employment contract).
- "Potvrda o boravku" — potvrda o prijavi boravišta ili adrese.
Za svaki dokument:
- datoteka: redni broj datoteke iz koje je dokument (kako su označene: 1, 2, 3…). Ako je dokument na više datoteka (prednja i stražnja strana), upiši datoteku s prednjom stranom.
- dokument_vrijedi_do: datum isteka valjanosti. Za ugovor o radu: datum završetka ako je ugovor na određeno, inače null.
- datum_izdavanja: datum izdavanja. Za ugovor o radu: datum sklapanja.
- broj_dokumenta: broj dokumenta točno kako piše (npr. Passport No., broj kartice), inače null.
- mjesto_izdavanja: mjesto ili tijelo koje je izdalo dokument (Place of issue / Authority), ako je navedeno, inače null.
Ako dokument ne odgovara nijednoj vrsti, nemoj ga dodati u "dokumenti", ali svejedno iskoristi njegove podatke o osobi.`;

// ─────────────────────────────────────────────────────────────
// JSON sheme (Claude je prisiljen vratiti točno ovaj oblik)
// ─────────────────────────────────────────────────────────────

const tekstIliNull = (description: string) => ({ type: ["string", "null"], description });

const DOKUMENT_SCHEMA = {
  type: "object",
  properties: {
    dokument_naziv: { type: "string", enum: [...VRSTE_DOKUMENATA] },
    datoteka: { type: "integer", description: "Redni broj datoteke (1, 2, 3…) iz koje je dokument" },
    dokument_vrijedi_do: tekstIliNull("Datum isteka valjanosti, YYYY-MM-DD"),
    datum_izdavanja: tekstIliNull("Datum izdavanja, YYYY-MM-DD"),
    broj_dokumenta: tekstIliNull("Broj dokumenta"),
    mjesto_izdavanja: tekstIliNull("Mjesto ili tijelo izdavanja"),
  },
  required: ["dokument_naziv", "datoteka", "dokument_vrijedi_do", "datum_izdavanja", "broj_dokumenta", "mjesto_izdavanja"],
  additionalProperties: false,
};

const RADNIK_POLJA = {
  ime: tekstIliNull("Osobno ime ili imena"),
  prezime: tekstIliNull("Prezime"),
  datum_rodjenja: tekstIliNull("Datum rođenja, YYYY-MM-DD"),
  mjesto_rodjenja: tekstIliNull("Mjesto rođenja"),
  drzava_rodjenja: tekstIliNull("Država rođenja, naziv na hrvatskom"),
  oib: tekstIliNull("Hrvatski OIB, točno 11 znamenki"),
  ime_oca: tekstIliNull("Ime oca, samo ako je izričito navedeno"),
  poslodavac: tekstIliNull("Naziv poslodavca"),
  radno_mjesto: tekstIliNull("Zanimanje ili radno mjesto"),
  dokumenti: { type: "array", items: DOKUMENT_SCHEMA },
};

const RADNIK_OBAVEZNA = Object.keys(RADNIK_POLJA);

const RADNIK_SCHEMA = {
  type: "object",
  properties: RADNIK_POLJA,
  required: RADNIK_OBAVEZNA,
  additionalProperties: false,
};

const BULK_SCHEMA = {
  type: "object",
  properties: {
    radnici: { type: "array", items: RADNIK_SCHEMA },
  },
  required: ["radnici"],
  additionalProperties: false,
};

// ─────────────────────────────────────────────────────────────
// Poziv Claude API-ja s rezervnim modelom
// ─────────────────────────────────────────────────────────────

interface Pokusaj {
  model: string;
  pauzaPrijeMs: number;
  maxTrajanjeMs: number;
}

const POKUSAJI: Pokusaj[] = [
  { model: SONNET, pauzaPrijeMs: 0, maxTrajanjeMs: 40_000 },
  { model: SONNET, pauzaPrijeMs: 1_500, maxTrajanjeMs: 40_000 },
  { model: HAIKU, pauzaPrijeMs: 500, maxTrajanjeMs: 30_000 },
];

class GreskaApija extends Error {
  constructor(
    message: string,
    public status: number,
    public vrsta: "preopterecen" | "timeout" | "neispravan_zahtjev" | "kljuc" | "prevelik" | "ostalo",
  ) {
    super(message);
  }
}

async function pozoviClaude(opcije: {
  sadrzaj: unknown[];
  schema: object;
  maxTokens: number;
}): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[extract] ANTHROPIC_API_KEY nije postavljen.");
    throw new GreskaEkstrakcije(
      "AI skeniranje nije podešeno (nedostaje ANTHROPIC_API_KEY). Dodaj ključ u Vercel → Settings → Environment Variables.",
      500,
    );
  }

  const rok = Date.now() + VREMENSKI_BUDZET_MS;
  let preskociSonnet = false;

  for (const pokusaj of POKUSAJI) {
    if (pokusaj.model === SONNET && preskociSonnet) continue;

    if (pokusaj.pauzaPrijeMs > 0) await spavaj(pokusaj.pauzaPrijeMs);

    const preostalo = rok - Date.now() - 1_000;
    if (preostalo < 5_000) break;
    const timeoutMs = Math.min(pokusaj.maxTrajanjeMs, preostalo);

    const pocetak = Date.now();
    try {
      const rezultat = await jedanPoziv(apiKey, pokusaj.model, opcije, timeoutMs);
      console.log(`[extract] OK — ${pokusaj.model}, ${Date.now() - pocetak} ms`);
      return rezultat;
    } catch (err) {
      const opis = err instanceof Error ? err.message : String(err);
      console.error(`[extract] ${pokusaj.model} nije uspio nakon ${Date.now() - pocetak} ms: ${opis}`);

      // Npr. AI odbio dokument — drugi pokušaj neće pomoći.
      if (err instanceof GreskaEkstrakcije) throw err;

      if (err instanceof GreskaApija) {
        // Ove greške neće nestati ponovnim pokušajem ni drugim modelom.
        if (err.vrsta === "kljuc") {
          throw new GreskaEkstrakcije(
            "AI ključ (ANTHROPIC_API_KEY) nije ispravan ili račun nema kredita. Provjeri Anthropic Console.",
            500,
          );
        }
        if (err.vrsta === "prevelik") {
          throw new GreskaEkstrakcije("Datoteke su prevelike za AI skeniranje. Pošalji manje datoteka odjednom.", 413);
        }
        // Timeout ili neispravan zahtjev na Sonnetu → odmah na Haiku, bez drugog pokušaja na Sonnetu.
        if (err.vrsta === "timeout" || err.vrsta === "neispravan_zahtjev") preskociSonnet = true;
      }
    }
  }

  throw new GreskaEkstrakcije(
    "AI servis je trenutno preopterećen. Pričekaj minutu i pokušaj ponovno, ili unesi podatke ručno.",
    503,
  );
}

async function jedanPoziv(
  apiKey: string,
  model: string,
  opcije: { sadrzaj: unknown[]; schema: object; maxTokens: number },
  timeoutMs: number,
): Promise<unknown> {
  const jeSonnet = model === SONNET;

  const tijelo: Record<string, unknown> = {
    model,
    max_tokens: opcije.maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: opcije.sadrzaj }],
    output_config: {
      format: { type: "json_schema", schema: opcije.schema },
      // Haiku 4.5 ne podržava "effort", pa ga šaljemo samo Sonnetu.
      ...(jeSonnet ? { effort: SONNET_EFFORT } : {}),
    },
  };
  // Sonnet 5.5 inače "razmišlja" prije odgovora; za čitanje dokumenata to nije potrebno i samo usporava.
  if (jeSonnet) tijelo.thinking = { type: "between_tools" };

  let odgovor: Response;
  try {
    odgovor = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify(tijelo),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const ime = (err as { name?: string })?.name;
    if (ime === "TimeoutError" || ime === "AbortError") {
      throw new GreskaApija(`Isteklo vrijeme (${timeoutMs} ms)`, 0, "timeout");
    }
    throw new GreskaApija(`Mrežna greška: ${(err as Error)?.message ?? err}`, 0, "preopterecen");
  }

  if (!odgovor.ok) {
    const tekst = await odgovor.text().catch(() => "");
    const s = odgovor.status;
    const poruka = `HTTP ${s}: ${tekst.slice(0, 500)}`;
    if (s === 401 || s === 403 || s === 402) throw new GreskaApija(poruka, s, "kljuc");
    if (s === 413) throw new GreskaApija(poruka, s, "prevelik");
    if (s === 400 && /credit balance|billing/i.test(tekst)) throw new GreskaApija(poruka, s, "kljuc");
    if (s === 400) throw new GreskaApija(poruka, s, "neispravan_zahtjev");
    if (s === 429 || s === 529 || s >= 500) throw new GreskaApija(poruka, s, "preopterecen");
    throw new GreskaApija(poruka, s, "ostalo");
  }

  const podaci = (await odgovor.json()) as {
    stop_reason?: string;
    content?: Array<{ type: string; text?: string }>;
  };

  if (podaci.stop_reason === "refusal") {
    throw new GreskaEkstrakcije("AI je odbio obraditi ovaj dokument. Unesi podatke ručno.", 422);
  }
  if (podaci.stop_reason === "max_tokens") {
    throw new GreskaApija("Odgovor je odrezan (max_tokens)", 0, "ostalo");
  }

  const tekst = podaci.content?.find((b) => b.type === "text")?.text;
  if (!tekst) throw new GreskaApija("Odgovor nema teksta", 0, "ostalo");

  try {
    return JSON.parse(tekst);
  } catch {
    // Ne bi se smjelo dogoditi uz JSON shemu, ali za svaki slučaj izvuci prvi {...} blok.
    const m = tekst.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new GreskaApija("Odgovor nije valjani JSON", 0, "ostalo");
  }
}

// ─────────────────────────────────────────────────────────────
// Pomoćne funkcije
// ─────────────────────────────────────────────────────────────

function blokoviDatoteka(datoteke: PripremljenaDatoteka[]): unknown[] {
  const blokovi: unknown[] = [];
  datoteke.forEach((d, i) => {
    blokovi.push({ type: "text", text: `Datoteka ${i + 1}: ${d.naziv}` });
    if (d.mediaType === "application/pdf") {
      blokovi.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: d.base64 },
      });
    } else {
      blokovi.push({
        type: "image",
        source: { type: "base64", media_type: d.mediaType, data: d.base64 },
      });
    }
  });
  return blokovi;
}

/** Prepoznaje stvarni format po prvim bajtovima (pouzdanije od nastavka imena datoteke). */
function prepoznajFormat(b: Uint8Array): PripremljenaDatoteka["mediaType"] | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
}

function normalizirajRadnika(sirovo: unknown, brojDatoteka: number): IzvuceniRadnik {
  const r = (sirovo && typeof sirovo === "object" ? sirovo : {}) as Record<string, unknown>;
  return {
    ime: tekst(r.ime),
    prezime: tekst(r.prezime),
    datum_rodjenja: datum(r.datum_rodjenja),
    drzava_rodjenja: tekst(r.drzava_rodjenja),
    oib: oib(r.oib),
    ime_oca: tekst(r.ime_oca),
    mjesto_rodjenja: tekst(r.mjesto_rodjenja),
    poslodavac: tekst(r.poslodavac),
    radno_mjesto: tekst(r.radno_mjesto),
    dokumenti: dokumenti(r.dokumenti, brojDatoteka),
  };
}

function dokumenti(v: unknown, brojDatoteka: number): IzvuceniDokument[] {
  if (!Array.isArray(v)) return [];
  const svi: IzvuceniDokument[] = [];
  for (const d of v) {
    if (!d || typeof d !== "object") continue;
    const zapis = d as Record<string, unknown>;
    const naziv = VRSTE_DOKUMENATA.find((x) => x === zapis.dokument_naziv);
    if (!naziv) continue;
    svi.push({
      dokument_naziv: naziv,
      kategorija: KATEGORIJA_PO_VRSTI[naziv],
      dokument_vrijedi_do: datum(zapis.dokument_vrijedi_do),
      datum_izdavanja: datum(zapis.datum_izdavanja),
      broj_dokumenta: tekst(zapis.broj_dokumenta),
      mjesto_izdavanja: tekst(zapis.mjesto_izdavanja),
      file_index: indeksDatoteke(zapis.datoteka, brojDatoteka),
    });
  }

  // Redom kako su datoteke poslane (dokumenti bez datoteke na kraj), pa makni duplikate
  // (npr. prednja i stražnja strana iste kartice prepoznate kao dva dokumenta).
  svi.sort((a, b) => (a.file_index ?? 999) - (b.file_index ?? 999));
  const vidjeno = new Set<string>();
  return svi.filter((dok) => {
    const kljuc = `${dok.dokument_naziv}|${dok.dokument_vrijedi_do}|${dok.datum_izdavanja}`;
    if (vidjeno.has(kljuc)) return false;
    vidjeno.add(kljuc);
    return true;
  });
}

/** AI broji datoteke od 1, frontend od 0. Vraća null ako broj nije valjan. */
function indeksDatoteke(v: unknown, brojDatoteka: number): number | null {
  const i = Number(v) - 1;
  return Number.isInteger(i) && i >= 0 && i < brojDatoteka ? i : null;
}

function tekst(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  if (!t || /^(null|n\/?a|-+)$/i.test(t)) return null;
  return t;
}

/** Prihvaća YYYY-MM-DD ili DD.MM.YYYY, vraća YYYY-MM-DD ili null ako datum nije stvaran. */
export function datum(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  let g: number, m: number, d: number;
  let p = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (p) {
    [g, m, d] = [Number(p[1]), Number(p[2]), Number(p[3])];
  } else if ((p = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})\.?$/))) {
    [d, m, g] = [Number(p[1]), Number(p[2]), Number(p[3])];
  } else {
    return null;
  }
  if (g < 1900 || g > 2100) return null;
  const dt = new Date(Date.UTC(g, m - 1, d));
  if (dt.getUTCFullYear() !== g || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${g}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** OIB se prihvaća samo ako ima 11 znamenki i ispravnu kontrolnu znamenku (ISO 7064, MOD 11,10). */
export function oib(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const znamenke = String(v).replace(/\D/g, "");
  if (znamenke.length !== 11) return null;
  let a = 10;
  for (let i = 0; i < 10; i++) {
    a = (a + Number(znamenke[i])) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }
  const kontrolna = (11 - a) % 10;
  if (kontrolna !== Number(znamenke[10])) {
    console.warn("[extract] AI je pročitao OIB s neispravnom kontrolnom znamenkom — ostavljam prazno.");
    return null;
  }
  return znamenke;
}

function spavaj(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
