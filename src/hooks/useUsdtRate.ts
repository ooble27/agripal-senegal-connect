import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Marge Ooble appliquée au taux de marché réel. */
export const OOBLE_MARGIN = 0.02;

/** Valeur de repli tant qu'aucun taux n'est chargé (USDT/CAD). */
const FALLBACK_BASE = 1.4020;

interface UsdtRate {
  /** Taux de marché réel USDT/CAD. */
  base: number;
  /** Ce que le client paie pour 1 USDT. */
  buy: number;
  /** Ce que le client reçoit pour 1 USDT. */
  sell: number;
  /** true si un taux réel a été chargé. */
  live: boolean;
}

interface Loaded { buy: number; sell: number; base: number }

/**
 * Dernier taux connu, partagé par toutes les pages : il s'affiche tout de
 * suite à chaque navigation (et au prochain lancement, via le stockage local),
 * puis il est relu au plus toutes les 30 secondes. Évite le passage par la
 * valeur de repli puis le saut vers le vrai taux.
 */
const STORE_KEY = "ooble.rate";
let last: (Loaded & { at: number }) | null = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    return v && v.buy > 0 && v.sell > 0 ? { ...v, at: 0 } : null;
  } catch { return null; }
})();
let inflight: Promise<Loaded | null> | null = null;

function remember(v: Loaded) {
  last = { ...v, at: Date.now() };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* stockage indisponible */ }
}

/**
 * Taux USDT/CAD. Source de vérité : la table `exchange_rates` (contrôlée côté
 * serveur, lecture publique). Repli : CoinGecko côté client, puis valeur fixe.
 */
export function useUsdtRate(): UsdtRate {
  const [loaded, setLoaded] = useState<Loaded | null>(() => last);

  useEffect(() => {
    let alive = true;
    if (last && Date.now() - last.at < 30_000) return;

    inflight ??= (async (): Promise<Loaded | null> => {
      // 1) Taux officiel Ooble depuis la base.
      const { data } = await supabase
        .from("exchange_rates")
        .select("buy_rate, sell_rate")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const buy = Number(data.buy_rate);
        const sell = Number(data.sell_rate);
        return { buy, sell, base: (buy + sell) / 2 };
      }
      // 2) Repli marché en direct (CoinGecko).
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=cad");
        const v = r.ok ? (await r.json())?.tether?.cad : null;
        if (typeof v === "number" && v > 0) return { base: v, buy: v * (1 + OOBLE_MARGIN), sell: v * (1 - OOBLE_MARGIN) };
      } catch { /* on garde le repli fixe */ }
      return null;
    })().finally(() => { inflight = null; });

    inflight.then((v) => {
      if (!v) return;
      remember(v);
      if (alive) setLoaded(v);
    });

    return () => { alive = false; };
  }, []);

  if (loaded) return { ...loaded, live: true };
  return {
    base: FALLBACK_BASE,
    buy: FALLBACK_BASE * (1 + OOBLE_MARGIN),
    sell: FALLBACK_BASE * (1 - OOBLE_MARGIN),
    live: false,
  };
}
