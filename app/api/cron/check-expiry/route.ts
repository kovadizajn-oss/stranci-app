import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DOC_LABELS: Record<string, string> = {
  radna_dozvola: 'Radna dozvola',
  lijecnicki: 'Liječnički pregled',
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}.`
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron (header) or manual test (query param)
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')
  const secret = process.env.CRON_SECRET
  if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const in30 = new Date()
  in30.setDate(today.getDate() + 30)
  const todayStr = today.toISOString().split('T')[0]
  const in30Str = in30.toISOString().split('T')[0]

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, tip_dokumenta, datum_isteka, employees(ime, prezime)')
    .lte('datum_isteka', in30Str)
    .gte('datum_isteka', todayStr)
    .order('datum_isteka', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!docs || docs.length === 0) return NextResponse.json({ sent: false, reason: 'No expiring docs' })

  const rows = docs.map((d: any) => {
    const emp = d.employees
    const days = daysUntil(d.datum_isteka)
    const urgency = days <= 7 ? '#DC2626' : days <= 14 ? '#CA8A04' : '#16A34A'
    return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #F1F5F9;font-size:14px;color:#1E293B;">
          ${emp ? `${emp.ime} ${emp.prezime}` : '—'}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #F1F5F9;font-size:14px;color:#475569;">
          ${DOC_LABELS[d.tip_dokumenta] || d.tip_dokumenta}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #F1F5F9;font-size:14px;">
          <span style="color:${urgency};font-weight:600;">${formatDate(d.datum_isteka)}</span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #F1F5F9;font-size:14px;color:${urgency};font-weight:600;">
          ${days === 0 ? 'Danas!' : days === 1 ? 'Sutra' : `Za ${days} dana`}
        </td>
      </tr>`
  }).join('')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#F8FAFC;padding:24px;">
      <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
        <div style="background:#2563EB;padding:20px 24px;">
          <h1 style="margin:0;color:white;font-size:18px;font-weight:600;">Kvantus — Nadolazeći rokovi</h1>
          <p style="margin:4px 0 0;color:#BFDBFE;font-size:13px;">
            ${new Date().toLocaleDateString('hr-HR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style="padding:20px 24px 8px;">
          <p style="margin:0 0 16px;font-size:14px;color:#475569;">
            Sljedeći dokumenti ističu za <strong>30 dana ili manje</strong>:
          </p>
          <table style="width:100%;border-collapse:collapse;background:white;">
            <thead>
              <tr style="background:#F8FAFC;">
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#94A3B8;font-weight:600;border-bottom:2px solid #E2E8F0;">RADNIK</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#94A3B8;font-weight:600;border-bottom:2px solid #E2E8F0;">DOKUMENT</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#94A3B8;font-weight:600;border-bottom:2px solid #E2E8F0;">ISTJEČE</th>
                <th style="padding:10px 14px;text-align:left;font-size:12px;color:#94A3B8;font-weight:600;border-bottom:2px solid #E2E8F0;">ZA</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="padding:16px 24px 20px;">
          <a href="https://kvantus.vercel.app/dashboard"
            style="display:inline-block;background:#2563EB;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">
            Otvori Kvantus →
          </a>
        </div>
      </div>
      <p style="text-align:center;font-size:11px;color:#94A3B8;margin-top:16px;">Kvantus automatska obavijest</p>
    </div>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Kvantus <onboarding@resend.dev>',
      to: ['kovadizajn@gmail.com', 'info@kvantus.com'],
      subject: `Kvantus — ${docs.length} ${docs.length === 1 ? 'dokument istječe' : 'dokumenata istječe'} uskoro`,
      html,
    }),
  })

  return NextResponse.json({ sent: true, count: docs.length })
}
