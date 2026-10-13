import { requireSession } from "@/lib/session";
import { izvuciRadnika, odgovorNaGresku, procitajDatotekeIzForme } from "@/lib/claude-extract";

// AI skeniranje dokumenata za JEDNOG radnika — Claude API (umjesto Gemini).
// Koriste ga /zaposlenici/uvoz i AI gumb na /zaposlenici/[id].
// Ulaz:  FormData s poljem "files" (jedna ili više slika/PDF-ova iste osobe; stranice ograničavaju na 3.5 MB)
// Izlaz: { data: { ime, prezime, datum_rodjenja, drzava_rodjenja, oib, ime_oca, poslodavac, radno_mjesto,
//                  dokumenti: [{ dokument_naziv, kategorija, dokument_vrijedi_do, datum_izdavanja, file_index }] } }
//        ili { error: "poruka" } uz odgovarajući status.

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const neprijavljen = await requireSession();
  if (neprijavljen) return neprijavljen;

  try {
    const formData = await request.formData();
    const datoteke = await procitajDatotekeIzForme(formData);
    const data = await izvuciRadnika(datoteke);
    return Response.json({ data });
  } catch (err) {
    return odgovorNaGresku(err);
  }
}
