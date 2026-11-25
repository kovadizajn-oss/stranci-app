import { requireSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase-server";
import {
  GreskaEkstrakcije,
  izvuciViseRadnika,
  odgovorNaGresku,
  pripremiBajtove,
  procitajDatotekeIzForme,
  type PripremljenaDatoteka,
} from "@/lib/claude-extract";

// AI skeniranje za GRUPNI uvoz — više datoteka za više radnika odjednom. Claude API.
// Ulaz:  FormData s poljem "files" (stranica šalje grupe do 10 datoteka i ~3,4 MB, jer Vercel prima najviše 4,5 MB)
//        i/ili poljem "paths": putanje u spremištu "dokumenti" (bulk-uvoz/privremeno/...) za velike datoteke
//        koje je preglednik poslao izravno u Supabase. Redoslijed za file_index: prvo "files", zatim "paths".
// Izlaz: { data: [ { ime, prezime, ..., dokumenti: [{ ..., file_index }] }, ... ] }
//        file_index = indeks poslane datoteke (0 = prva) iz koje je dokument — za upload slike.
//        ili { error: "poruka" } uz odgovarajući status.

export const runtime = "nodejs";
export const maxDuration = 60;

const PRIVREMENA_PUTANJA = /^bulk-uvoz\/privremeno\/[A-Za-z0-9._-]{1,200}$/;
const MAX_IZ_SPREMISTA = 20 * 1024 * 1024; // AI prima najviše ~32 MB po zahtjevu (base64 je za trećinu veći)

export async function POST(request: Request) {
  const neprijavljen = await requireSession();
  if (neprijavljen) return neprijavljen;

  let putanje: string[] = [];
  try {
    const formData = await request.formData();
    putanje = formData.getAll("paths").filter((p): p is string => typeof p === "string" && p.length > 0);
    const imaDatoteka = [...formData.getAll("files"), ...formData.getAll("file")].some((u) => typeof u !== "string");

    const datoteke: PripremljenaDatoteka[] = [
      ...(imaDatoteka ? await procitajDatotekeIzForme(formData) : []),
      ...(await procitajIzSpremista(putanje)),
    ];
    if (datoteke.length === 0) throw new GreskaEkstrakcije("Nije priložena nijedna datoteka.", 400);

    const data = await izvuciViseRadnika(datoteke);
    return Response.json({ data });
  } catch (err) {
    return odgovorNaGresku(err);
  } finally {
    // Privremene datoteke su bile samo za analizu — pri spremanju radnika preglednik ih ponovno šalje u mapu zaposlenika.
    if (putanje.length) {
      await createAdminClient().storage.from("dokumenti").remove(putanje).catch(() => {});
    }
  }
}

async function procitajIzSpremista(putanje: string[]): Promise<PripremljenaDatoteka[]> {
  if (putanje.length === 0) return [];
  const supabase = createAdminClient();
  const rezultat: PripremljenaDatoteka[] = [];
  for (const putanja of putanje) {
    if (!PRIVREMENA_PUTANJA.test(putanja)) throw new GreskaEkstrakcije("Neispravna putanja datoteke.", 400);
    const { data, error } = await supabase.storage.from("dokumenti").download(putanja);
    if (error || !data) {
      console.error("[extract-bulk] Preuzimanje iz spremišta nije uspjelo:", putanja, error);
      throw new GreskaEkstrakcije("Datoteka nije stigla u spremište. Pokušaj ponovno.", 502);
    }
    if (data.size > MAX_IZ_SPREMISTA) {
      throw new GreskaEkstrakcije("Datoteka je veća od 20 MB — podijeli PDF ili ga spremi u manjoj rezoluciji.", 413);
    }
    const naziv = putanja.split("/").pop()!.replace(/^\d+_[a-z0-9]+_/, "");
    rezultat.push(pripremiBajtove(naziv, new Uint8Array(await data.arrayBuffer())));
  }
  return rezultat;
}
