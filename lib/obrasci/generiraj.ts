import type { Obrazac } from './tipovi'

// Upisuje vrijednosti u službeni PDF predložak (u pregledniku, pdf-lib).
// Font Carlito (metrički isti kao Calibri) podržava č, ć, đ, š, ž.

type Font = { widthOfTextAtSize: (t: string, s: number) => number }

function prelomi(tekst: string, font: Font, velicina: number, sirina: number): string[] {
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

export async function generirajPdf(obrazac: Obrazac, v: Record<string, string>): Promise<Uint8Array> {
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
    const stranica = stranice[c.stranica]
    if (!stranica) continue
    const H = stranica.getHeight()

    if (c.tip === 'krug') {
      const o = c.opcije[v[c.kljuc] || '']
      if (o) stranica.drawEllipse({ x: o.x + 3, y: H - o.top - 4.75, xScale: 6, yScale: 6.25, borderColor: crna, borderWidth: 1 })
      continue
    }

    const tekst = (c.tekst ? c.tekst(v) : v[c.kljuc || ''] || '').trim()
    if (!tekst) continue
    // Ako ne stane u ćeliju, smanji slova (najviše do 7 pt)
    let velicina = c.velicina || 10
    let redovi = prelomi(tekst, font, velicina, c.desno - c.x)
    while (velicina > 7 && redovi.length * velicina * 1.2 > c.bottom - c.top - 2) {
      velicina -= 0.5
      redovi = prelomi(tekst, font, velicina, c.desno - c.x)
    }
    const razmak = velicina * 1.2
    const y0 = H - (c.top + c.bottom) / 2 + (redovi.length * razmak) / 2 - velicina * 0.85
    redovi.forEach((red, i) => stranica.drawText(red, { x: c.x, y: y0 - i * razmak, size: velicina, font, color: crna }))
  }
  return pdf.save()
}
