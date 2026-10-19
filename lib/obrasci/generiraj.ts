import type { Crtanje, Obrazac, ObrazacPopis } from './tipovi'
import { popuniDocx } from './docx'

// Generiranje gotovog dokumenta u pregledniku.
//  PDF:  upisivanje u službeni predložak (pdf-lib). Font Carlito (kao Calibri) ima č, ć, đ, š, ž.
//  DOCX: zamjena oznaka {{KLJUC}} u Word predlošku.

type Font = { widthOfTextAtSize: (t: string, s: number) => number }

export function prelomi(tekst: string, font: Font, velicina: number, sirina: number): string[] {
  const redovi: string[] = []
  for (const odlomak of tekst.split('\n')) {
    let trenutni = ''
    for (const rijec of odlomak.split(/\s+/).filter(Boolean)) {
      const pokusaj = trenutni ? `${trenutni} ${rijec}` : rijec
      if (!trenutni || font.widthOfTextAtSize(pokusaj, velicina) <= sirina) trenutni = pokusaj
      else { redovi.push(trenutni); trenutni = rijec }
    }
    if (trenutni) redovi.push(trenutni)
  }
  return redovi
}

/** Raspored teksta: redovi + veličina + y osnovne linije prvog reda (od vrha stranice). */
export function rasporedi(c: Extract<Crtanje, { tip: 'tekst' }>, tekst: string, font: Font) {
  const sirina = c.desno - c.x
  let velicina = c.velicina || 10
  if (c.linija !== undefined) {
    // Jedan red na crti — smanji slova dok ne stane
    const red = tekst.replace(/\s+/g, ' ')
    while (velicina > 6 && font.widthOfTextAtSize(red, velicina) > sirina) velicina -= 0.5
    return { redovi: [red], velicina, ys: [c.linija] }
  }
  if (c.linije?.length) {
    // Više crta — prelomi tekst po crtama, smanji slova ako ne stane
    let redovi = prelomi(tekst, font, velicina, sirina)
    while (velicina > 6 && redovi.length > c.linije.length) {
      velicina -= 0.5
      redovi = prelomi(tekst, font, velicina, sirina)
    }
    return { redovi: redovi.slice(0, c.linije.length), velicina, ys: c.linije.slice(0, redovi.length) }
  }
  const top = c.top ?? 0
  const bottom = c.bottom ?? top + 14
  let redovi = prelomi(tekst, font, velicina, sirina)
  while (velicina > 7 && redovi.length * velicina * 1.2 > bottom - top - 2) {
    velicina -= 0.5
    redovi = prelomi(tekst, font, velicina, sirina)
  }
  const razmak = velicina * 1.2
  const prviY = (top + bottom) / 2 - (redovi.length * razmak) / 2 + velicina * 0.85
  return { redovi, velicina, ys: redovi.map((_, i) => prviY + i * razmak) }
}

export async function generirajPdf(obrazac: Extract<Obrazac, { format: 'pdf' }>, v: Record<string, string>): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import('pdf-lib')
  const fontkit = (await import('@pdf-lib/fontkit')).default
  const [predlozak, fontBytes] = await Promise.all([
    fetch(obrazac.predlozak).then(r => { if (!r.ok) throw new Error('Predložak obrasca nije pronađen.'); return r.arrayBuffer() }),
    fetch('/fonts/Carlito-Regular.ttf').then(r => { if (!r.ok) throw new Error('Font nije pronađen.'); return r.arrayBuffer() }),
  ])
  const pdf = await PDFDocument.load(predlozak)
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(fontBytes, { subset: false })
  const stranice = pdf.getPages()
  const crna = rgb(0, 0, 0)

  for (const c of obrazac.crtanje) {
    if (c.tip === 'oznaka') {
      for (const t of c.opcije[v[c.kljuc] || ''] || []) {
        const stranica = stranice[t.stranica ?? c.stranica]
        if (!stranica) continue
        const y = stranica.getHeight() - t.y
        if (c.stil === 'krug') {
          stranica.drawEllipse({ x: t.x, y, xScale: 6, yScale: 6.25, borderColor: crna, borderWidth: 1 })
        } else {
          const d = 3.2
          stranica.drawLine({ start: { x: t.x - d, y: y - d }, end: { x: t.x + d, y: y + d }, thickness: 1.2, color: crna })
          stranica.drawLine({ start: { x: t.x - d, y: y + d }, end: { x: t.x + d, y: y - d }, thickness: 1.2, color: crna })
        }
      }
      continue
    }
    const stranica = stranice[c.stranica]
    if (!stranica) continue
    const tekst = (c.tekst ? c.tekst(v) : v[c.kljuc || ''] || '').trim()
    if (!tekst) continue
    const H = stranica.getHeight()
    const { redovi, velicina, ys } = rasporedi(c, tekst, font)
    redovi.forEach((red, i) => stranica.drawText(red, { x: c.x, y: H - ys[i], size: velicina, font, color: crna }))
  }
  return pdf.save()
}

export async function generirajDocx(obrazac: Extract<Obrazac, { format: 'docx' }>, v: Record<string, string>): Promise<Uint8Array> {
  const res = await fetch(obrazac.predlozak)
  if (!res.ok) throw new Error('Predložak obrasca nije pronađen.')
  return popuniDocx(new Uint8Array(await res.arrayBuffer()), obrazac.zamjene(v))
}

export async function generiraj(obrazac: Obrazac, v: Record<string, string>) {
  const bytes = obrazac.format === 'pdf' ? await generirajPdf(obrazac, v) : await generirajDocx(obrazac, v)
  const tip = obrazac.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return { bytes, tip, nastavak: obrazac.format }
}

/** Popis više radnika (Word): redak tablice ponovi se za svakog radnika. */
export async function generirajPopis(popis: ObrazacPopis, redovi: Record<string, string>[], zajednicko: Record<string, string>) {
  const res = await fetch(popis.predlozak)
  if (!res.ok) throw new Error('Predložak popisa nije pronađen.')
  return popuniDocx(new Uint8Array(await res.arrayBuffer()), popis.zamjene(zajednicko), redovi.map(r => popis.redakZamjene(r, zajednicko)))
}
