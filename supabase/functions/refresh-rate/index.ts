// Fonction edge Ooble — rafraîchit le taux USDT/CAD dans `exchange_rates`.
//
// Récupère le taux de marché (CoinGecko), applique la marge Ooble, et insère
// une nouvelle ligne. À planifier (cron Supabase) toutes les quelques minutes.
//
// Utilise SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (injectés automatiquement).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MARGIN = 0.02;

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  // Taux de marché réel.
  let base: number | null = null;
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=cad");
    const data = await res.json();
    const v = data?.tether?.cad;
    if (typeof v === "number" && v > 0) base = v;
  } catch { /* ignore */ }

  if (!base) {
    return new Response(JSON.stringify({ error: "Taux de marché indisponible." }), {
      status: 502, headers: { "Content-Type": "application/json" },
    });
  }

  const buy_rate = Math.round(base * (1 + MARGIN) * 1e6) / 1e6;
  const sell_rate = Math.round(base * (1 - MARGIN) * 1e6) / 1e6;

  const { error } = await supabase
    .from("exchange_rates")
    .insert({ source: "coingecko", buy_rate, sell_rate });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, base, buy_rate, sell_rate }), {
    headers: { "Content-Type": "application/json" },
  });
});
