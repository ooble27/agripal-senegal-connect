/**
 * Prix d'un achat selon son montant : sous 1 000 $, le taux d'achat est
 * majoré de 4 % ; à partir de 1 000 $, c'est le taux publié. Le palier se
 * décide sur le montant payé en CAD (arrondi au cent), comme en base.
 */
import { SMALL_BUY_MARKUP, SMALL_BUY_THRESHOLD_CAD } from "@/lib/config";

export interface BuyQuote {
  cad: number;
  usdt: number;
  /** Taux appliqué (CAD pour 1 USDT). */
  rate: number;
  /** true si le taux majoré « petit montant » s'applique. */
  small: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const smallRate = (buy: number) => buy * (1 + SMALL_BUY_MARKUP);
export const rateForCad = (cad: number, buy: number) => (round2(cad) < SMALL_BUY_THRESHOLD_CAD ? smallRate(buy) : buy);

/** Le client saisit un montant en CAD. */
export function quoteFromCad(cad: number, buy: number): BuyQuote {
  const c = round2(cad);
  const rate = rateForCad(c, buy);
  return { cad: c, usdt: c / rate, rate, small: rate !== buy };
}

/**
 * Le client saisit un montant en USDT. Entre les deux paliers (au taux
 * normal moins de 1 000 $, mais 1 000 $ ou plus une fois majoré), il paie
 * 1 000 $ au taux normal : toujours à son avantage.
 */
export function quoteFromUsdt(usdt: number, buy: number): BuyQuote {
  const normal = round2(usdt * buy);
  if (normal >= SMALL_BUY_THRESHOLD_CAD) return { cad: normal, usdt, rate: buy, small: false };
  const small = round2(usdt * smallRate(buy));
  if (small < SMALL_BUY_THRESHOLD_CAD) return { cad: small, usdt, rate: smallRate(buy), small: true };
  return quoteFromCad(SMALL_BUY_THRESHOLD_CAD, buy);
}

/** Montant USDT maximal pour un montant CAD maximal donné. */
export const maxUsdtForCad = (maxCad: number, buy: number) => maxCad / rateForCad(maxCad, buy);
