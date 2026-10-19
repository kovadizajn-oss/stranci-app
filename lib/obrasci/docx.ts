// Popunjavanje Word (.docx) predloška bez vanjskih biblioteka.
// .docx je ZIP: čitamo ga (DecompressionStream), zamijenimo oznake {{KLJUC}} u XML-u
// i zapišemo novi ZIP (nesažeto — Word to normalno otvara).

type Unos = { ime: string; podaci: Uint8Array }

const enc = new TextEncoder()
const dec = new TextDecoder()

let CRC_TABLICA: Uint32Array | null = null
function crc32(podaci: Uint8Array) {
  if (!CRC_TABLICA) {
    CRC_TABLICA = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLICA[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < podaci.length; i++) crc = CRC_TABLICA[(crc ^ podaci[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

async function inflateRaw(podaci: Uint8Array): Promise<Uint8Array> {
  const tok = new Blob([new Uint8Array(podaci)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(tok).arrayBuffer())
}

export async function procitajZip(buf: Uint8Array): Promise<Unos[]> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let e = buf.length - 22
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--
  if (e < 0) throw new Error('Predložak nije ispravna .docx datoteka.')
  const broj = dv.getUint16(e + 10, true)
  let p = dv.getUint32(e + 16, true)
  const unosi: Unos[] = []
  for (let i = 0; i < broj; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Oštećen .docx predložak.')
    const metoda = dv.getUint16(p + 10, true)
    const velicina = dv.getUint32(p + 20, true)
    const nlen = dv.getUint16(p + 28, true)
    const elen = dv.getUint16(p + 30, true)
    const clen = dv.getUint16(p + 32, true)
    const lokalni = dv.getUint32(p + 42, true)
    const ime = dec.decode(buf.subarray(p + 46, p + 46 + nlen))
    p += 46 + nlen + elen + clen
    const pocetak = lokalni + 30 + dv.getUint16(lokalni + 26, true) + dv.getUint16(lokalni + 28, true)
    const sirovo = buf.subarray(pocetak, pocetak + velicina)
    let podaci: Uint8Array
    if (metoda === 0) podaci = sirovo.slice()
    else if (metoda === 8) podaci = await inflateRaw(sirovo)
    else throw new Error('Nepodržani .docx predložak.')
    unosi.push({ ime, podaci })
  }
  return unosi
}

export function zapisiZip(unosi: Unos[]): Uint8Array {
  const dijelovi: Uint8Array[] = []
  const sredisnji: Uint8Array[] = []
  const datumDos = ((2026 - 1980) << 9) | (1 << 5) | 1
  let pomak = 0
  for (const u of unosi) {
    const ime = enc.encode(u.ime)
    const crc = crc32(u.podaci)
    const lok = new Uint8Array(30 + ime.length)
    const l = new DataView(lok.buffer)
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x0800, true); l.setUint16(8, 0, true)
    l.setUint16(10, 0, true); l.setUint16(12, datumDos, true); l.setUint32(14, crc, true)
    l.setUint32(18, u.podaci.length, true); l.setUint32(22, u.podaci.length, true)
    l.setUint16(26, ime.length, true); l.setUint16(28, 0, true)
    lok.set(ime, 30)
    const cen = new Uint8Array(46 + ime.length)
    const c = new DataView(cen.buffer)
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true)
    c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, datumDos, true); c.setUint32(16, crc, true)
    c.setUint32(20, u.podaci.length, true); c.setUint32(24, u.podaci.length, true); c.setUint16(28, ime.length, true)
    c.setUint32(42, pomak, true)
    cen.set(ime, 46)
    dijelovi.push(lok, u.podaci)
    sredisnji.push(cen)
    pomak += lok.length + u.podaci.length
  }
  const velicinaCd = sredisnji.reduce((s, x) => s + x.length, 0)
  const kraj = new Uint8Array(22)
  const k = new DataView(kraj.buffer)
  k.setUint32(0, 0x06054b50, true); k.setUint16(8, unosi.length, true); k.setUint16(10, unosi.length, true)
  k.setUint32(12, velicinaCd, true); k.setUint32(16, pomak, true)
  const sve = [...dijelovi, ...sredisnji, kraj]
  const out = new Uint8Array(sve.reduce((s, x) => s + x.length, 0))
  let o = 0
  for (const d of sve) { out.set(d, o); o += d.length }
  return out
}

function xmlEscape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Zamjena {{KLJUC}} → vrijednost (novi red = prijelom reda u Wordu). */
function zamijeni(xml: string, vrijednosti: Record<string, string>) {
  return xml.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k: string) =>
    xmlEscape(vrijednosti[k] ?? '').split('\n').join('</w:t><w:br/><w:t xml:space="preserve">'))
}

/**
 * Popuni .docx predložak.
 * @param redovi  za tablicu: redak koji sadrži oznake {{R_...}} ponovi se za svaki element
 */
export async function popuniDocx(predlozak: Uint8Array, vrijednosti: Record<string, string>, redovi?: Record<string, string>[]) {
  const unosi = await procitajZip(predlozak)
  for (const u of unosi) {
    if (!/^word\/(document|header\d*|footer\d*)\.xml$/.test(u.ime)) continue
    let xml = dec.decode(u.podaci)
    if (redovi) {
      xml = xml.replace(/<w:tr[ >][\s\S]*?<\/w:tr>/g, tr =>
        tr.includes('{{R_') ? redovi.map(r => zamijeni(tr, r)).join('') : tr)
    }
    u.podaci = enc.encode(zamijeni(xml, vrijednosti))
  }
  return zapisiZip(unosi)
}
