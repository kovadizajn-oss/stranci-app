import type { Obrazac, ObrazacPopis } from './tipovi'
import { UPUTNICA_EP1 } from './uputnica-ep1'
import { OBRAZAC_16A } from './obrazac-16a'
import { OBRAZAC_17A } from './obrazac-17a'
import { OBRAZAC_18A } from './obrazac-18a'
import { SANITARNA } from './sanitarna'
import { ZAHTJEV_UKIDANJE } from './zahtjev-ukidanje'
import { UGOVOR_O_RADU } from './ugovor-o-radu'
import { POPIS_LIJECNICKI } from './popis-lijecnicki'

/** Obrasci za jednog radnika. Novi obrazac = nova datoteka + dodati ovdje. */
export const OBRASCI: Obrazac[] = [UPUTNICA_EP1, OBRAZAC_16A, OBRAZAC_17A, OBRAZAC_18A, SANITARNA, ZAHTJEV_UKIDANJE, UGOVOR_O_RADU]

/** Popisi za više radnika odjednom. */
export const POPISI: ObrazacPopis[] = [POPIS_LIJECNICKI]

export * from './tipovi'
