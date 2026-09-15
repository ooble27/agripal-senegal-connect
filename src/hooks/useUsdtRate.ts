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
 * Taux USDT/CAD. Source de vérité : la table `exchange_rates` (contrôlée côté
 * serveur, lecture publique). Repli : CoinGecko côté client, puis valeur fixe.
 */
export function useUsdtRate(): UsdtRate {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let alive = true;

    // 1) Taux officiel Ooble depuis la base.
    supabase
      .from("exchange_rates")
      .select("buy_rate, sell_rate")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        if (data) {
          const buy = Number(data.buy_rate);
          const sell = Number(data.sell_rate);
          setLoaded({ buy, sell, base: (buy + sell) / 2 });
          return;
        }
        // 2) Repli marché en direct (CoinGecko).
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=cad")
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((d) => {
            const v = d?.tether?.cad;
            if (alive && typeof v === "number" && v > 0) {
              setLoaded({ base: v, buy: v * (1 + OOBLE_MARGIN), sell: v * (1 - OOBLE_MARGIN) });
            }
          })
          .catch(() => { /* on garde le repli fixe */ });
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
