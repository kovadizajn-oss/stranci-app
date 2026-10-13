import { requireSession } from "@/lib/session";
import { izvuciViseRadnika, odgovorNaGresku, procitajDatotekeIzForme } from "@/lib/claude-extract";

// AI skeniranje za GRUPNI uvoz — više datoteka za više radnika odjednom. Claude API (umjesto Gemini).
// Ulaz:  FormData s poljem "files" (stranica šalje do 10 datoteka po batchu, Vercel prima najviše 4.5 MB)
// Izlaz: { data: [ { ime, prezime, ..., dokumenti: [{ ..., file_index }] }, ... ] }
//        file_index = indeks poslane datoteke (0 = prva) iz koje je dokument — za upload slike.
//        ili { error: "poruka" } uz odgovarajući status.

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const neprijavljen = await requireSession();
  if (neprijavljen) return neprijavljen;

  try {
    const formData = await request.formData();
    const datoteke = await procitajDatotekeIzForme(formData);
    const data = await izvuciViseRadnika(datoteke);
    return Response.json({ data });
  } catch (err) {
    return odgovorNaGresku(err);
  }
}
