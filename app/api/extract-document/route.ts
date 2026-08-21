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
      text: `You are a document reader for a Croatian worker management system. Extract all available worker information from the provided document image(s) (passport, ID card, work permit, or similar).

Return ONLY a valid JSON object with these exact fields (use null for any field not found):
{
  "ime": "first name",
  "prezime": "last name",
  "datum_rodjenja": "date of birth in YYYY-MM-DD format",
  "drzava_rodjenja": "country of birth or nationality — translate to Croatian (e.g. Ukrajina, Bosna i Hercegovina, Nepal)",
  "oib": "Croatian OIB (11-digit personal ID number) if present, otherwise null",
  "ime_oca": "father's name if present, otherwise null",
  "poslodavac": "employer name if this is a work permit, otherwise null",
  "radno_mjesto": "job position/title if present, otherwise null",
  "dokument_broj": "document number (passport number, ID number, permit number)",
  "dokument_vrijedi_do": "document expiry date in YYYY-MM-DD format, or null"
}

Return ONLY the JSON object, no explanation, no markdown, no code blocks.`,
    })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
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
      return NextResponse.json({ error: 'Greška pri analizi dokumenta. Pokušajte ponovo.' }, { status: 500 })
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Strip markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let extracted
    try {
      extracted = JSON.parse(cleaned)
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })
      extracted = JSON.parse(match[0])
    }

    return NextResponse.json({ data: extracted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
