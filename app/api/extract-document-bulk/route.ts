import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const parts: any[] = []

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      parts.push({
        inline_data: {
          mime_type: file.type,
          data: base64,
        },
      })
    }

    parts.push({
      text: `You are a document reader for a Croatian worker management system. Multiple document images are provided — they may belong to different people.

Extract worker information from each document. Group documents that belong to the same person based on matching name and date of birth.

Return ONLY a valid JSON array where each element is one worker:
[
  {
    "ime": "first name",
    "prezime": "last name",
    "datum_rodjenja": "date of birth in YYYY-MM-DD format, or null",
    "drzava_rodjenja": "country of birth or nationality in Croatian (e.g. Ukrajina, Nepal, Bosna i Hercegovina), or null",
    "oib": "Croatian OIB (11-digit personal ID number) if present, otherwise null",
    "ime_oca": "father's name if present, otherwise null",
    "radno_mjesto": "job position/title if present, otherwise null",
    "dokumenti": [
      {
        "dokument_naziv": "one of: Putovnica, Osobna iskaznica, Vozačka dozvola, Boravišna dozvola, Radna dozvola, Liječnički pregled, Ugovor o radu, Potvrda o boravku — pick the best match",
        "kategorija": "osobni if identity document (Putovnica, Osobna iskaznica, Vozačka dozvola, Boravišna dozvola), or prateci if work/administrative (Radna dozvola, Liječnički pregled, Ugovor o radu, Potvrda o boravku)",
        "dokument_vrijedi_do": "document expiry date in YYYY-MM-DD format, or null",
        "datum_izdavanja": "document issue date in YYYY-MM-DD format, or null",
        "file_index": "the 0-based index of the image/file in the provided list that this document came from (0 = first image, 1 = second image, etc.)"
      }
    ]
  }
]

If multiple documents belong to the same person, list them all in that person's "dokumenti" array — do not create duplicate worker entries.
The images are provided in order starting from index 0. Each document entry must include the correct file_index pointing to its source image.

Return ONLY the JSON array, no explanation, no markdown, no code blocks.`,
    })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
      }
    )

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      const status = errData?.error?.code
      if (status === 503 || status === 429) {
        return NextResponse.json({ error: 'AI servis je trenutno zauzet. Pokušajte ponovo za nekoliko sekundi.' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Greška pri analizi dokumenata. Pokušajte ponovo.' }, { status: 500 })
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let extracted
    try {
      extracted = JSON.parse(cleaned)
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (!match) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })
      extracted = JSON.parse(match[0])
    }

    if (!Array.isArray(extracted)) extracted = [extracted]

    return NextResponse.json({ data: extracted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
