/*
 * Fonction Vercel (Edge) : lieu approximatif du visiteur, d'après sa
 * connexion internet. Vercel ajoute ces en-têtes à chaque requête ; on les
 * renvoie tels quels, sans rien enregistrer ici. Sert à l'origine des
 * inscriptions (src/lib/origin.ts).
 */
export const config = { runtime: "edge" };

const decode = (v: string | null) => {
  if (!v) return null;
  try { return decodeURIComponent(v); } catch { return v; }
};

export default function handler(req: Request): Response {
  const h = req.headers;
  const body = {
    country: h.get("x-vercel-ip-country"),
    region: decode(h.get("x-vercel-ip-country-region")),
    city: decode(h.get("x-vercel-ip-city")),
  };
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
