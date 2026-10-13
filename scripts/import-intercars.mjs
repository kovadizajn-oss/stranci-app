// Jednokratni uvoz radnika iz mape "INTERCARS (30)" u Kvantus Admin (Supabase).
//
// Pokretanje (u Cursor terminalu, u mapi stranci-app):
//   node scripts/import-intercars.mjs          -> PROBA: samo provjeri i ispiše što bi napravio, ništa ne mijenja
//   node scripts/import-intercars.mjs --go     -> STVARNI UVOZ: kreira radnike, uploada datoteke, kreira dokumente
//
// Podaci o radnicima su u scripts/intercars-import.json (pregledani u Intercars_uvoz_pregled.xlsx).
// Koristi NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY iz .env.local. Ne treba nikakav npm paket.
// Radnik koji već postoji (isti OIB, ili isto ime + prezime + datum rođenja) se preskače.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// ── Postavke ────────────────────────────────────────────────
const SOURCE_DIR =
  process.env.INTERCARS_DIR ||
  "C:\\Users\\lilfu\\Downloads\\INTERCARS (30)-20260929T131911Z-1-001\\INTERCARS (30)";
const STATUS = "Novi uvoz"; // isti status kao kod uvoza kroz aplikaciju; promijeni ručno u "Aktivan" nakon provjere
const KORISNIK = { naziv: "ILS Adriatic Logistika d.o.o." }; // tablica companies ima samo naziv + kontakt polja
const BUCKET = "dokumenti";
// ────────────────────────────────────────────────────────────

const GO = process.argv.includes("--go");

function readEnv() {
  const env = {};
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) throw new Error(".env.local nije pronađen u " + ROOT);
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = readEnv();
const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Nedostaje NEXT_PUBLIC_SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY u .env.local");

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(method, table, { query = "", body } = {}) {
  const res = await fetch(`${URL_}/rest/v1/${table}${query}`, {
    method,
    headers: { ...H, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${table} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const MIME = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

function safeName(name) {
  // Supabase Storage ne voli razmake i dijakritike u putanji
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_");
}

async function upload(localPath, storagePath) {
  const bytes = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${encoded}`, {
    method: "POST",
    headers: { ...H, "Content-Type": MIME[ext] || "application/octet-stream", "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${storagePath} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return `${URL_}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(path.join(HERE, "intercars-import.json"), "utf8"));
  console.log(GO ? "=== STVARNI UVOZ ===" : "=== PROBA (ništa se ne mijenja) — za stvarni uvoz dodaj --go ===");
  console.log(`Radnika: ${data.length}, izvorna mapa: ${SOURCE_DIR}\n`);

  // 1) Provjera da sve datoteke postoje
  let missing = 0;
  for (const w of data) for (const d of w.documents) {
    const p = path.join(SOURCE_DIR, w.folder, d.file);
    if (!fs.existsSync(p)) { missing++; console.log(`  ✗ nema datoteke: ${w.folder}/${d.file}`); }
  }
  if (missing) { console.log(`\n${missing} datoteka nedostaje — provjeri putanju SOURCE_DIR. Prekidam.`); process.exit(1); }
  console.log("✓ Sve datoteke postoje.");

  // 2) Postojeći radnici i tvrtka
  const existing = await rest("GET", "employees", { query: "?select=id,ime,prezime,datum_rodjenja,oib" });
  console.log(`✓ Spojeno na bazu. Postojećih radnika: ${existing.length}`);
  let company = (await rest("GET", "companies", { query: `?select=id,naziv&naziv=ilike.*ILS*Adriatic*` }))[0];
  if (company) console.log(`✓ Tvrtka postoji: ${company.naziv}`);
  else console.log(`• Tvrtka "${KORISNIK.naziv}" ne postoji — ${GO ? "kreiram je" : "bit će kreirana"}.`);
  if (!company && GO) company = (await rest("POST", "companies", { body: KORISNIK }))[0];

  const key = (e) => `${(e.ime || "").toLowerCase()}|${(e.prezime || "").toLowerCase()}|${e.datum_rodjenja}`;
  const oibs = new Set(existing.map((e) => e.oib).filter(Boolean));
  const keys = new Set(existing.map(key));

  let created = 0, skipped = 0, docs = 0, failed = 0;
  const log = [];
  for (const w of data) {
    const e = w.employee;
    const name = `${e.prezime} ${e.ime}`;
    if ((e.oib && oibs.has(e.oib)) || keys.has(key(e))) {
      console.log(`↷ ${name} — već postoji, preskačem`); skipped++; continue;
    }
    console.log(`+ ${name} (${w.documents.length} dok.)`);
    if (!GO) continue;
    try {
      const [emp] = await rest("POST", "employees", { body: {
        ime: e.ime, prezime: e.prezime, datum_rodjenja: e.datum_rodjenja, drzava_rodjenja: e.drzava_rodjenja,
        oib: e.oib, ime_oca: e.ime_oca, adresa_smjestaja: e.adresa_smjestaja, radno_mjesto: e.radno_mjesto,
        poslodavac: company?.naziv || KORISNIK.naziv, company_id: company?.id || null, status_zaposlenika: STATUS,
      } });
      created++;
      for (const d of w.documents) {
        const local = path.join(SOURCE_DIR, w.folder, d.file);
        let fileUrl = null;
        try {
          fileUrl = await upload(local, `${emp.id}/doc_${Date.now()}_${safeName(d.file)}`);
        } catch (err) { console.log(`   ! upload nije uspio (${d.file}): ${err.message}`); }
        await rest("POST", "documents", { body: {
          employee_id: emp.id, naziv: d.naziv, kategorija: d.kategorija,
          datum_izdavanja: d.datum_izdavanja, datum_isteka: d.datum_isteka, file_url: fileUrl,
        } });
        docs++;
      }
      log.push({ name, id: emp.id });
    } catch (err) {
      failed++; console.log(`   ✗ GREŠKA za ${name}: ${err.message}`);
    }
  }
  console.log(`\nGotovo. ${GO ? `Kreirano radnika: ${created}, dokumenata: ${docs}` : `Za kreiranje: ${data.length - skipped}`}, preskočeno: ${skipped}, greške: ${failed}`);
  if (GO) fs.writeFileSync(path.join(HERE, "import-intercars.log.json"), JSON.stringify(log, null, 1));
}

main().catch((err) => { console.error("\nPREKINUTO:", err.message); process.exit(1); });
