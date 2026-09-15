import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Coin, { type CoinId } from "./Coin";
import { T, useLang } from "@/lib/i18n";

interface Row {
  id: CoinId;
  name: string;
  sym: string;
  price: string;
  chg: string;
  up: boolean;
  tradable?: boolean;
}

const rows: Row[] = [
  { id: "usdt", name: "Tether", sym: "USDT", price: "1,4245 $", chg: "+0,12 %", up: true, tradable: true },
  { id: "usdc", name: "USD Coin", sym: "USDC", price: "1,4240 $", chg: "+0,05 %", up: true },
  { id: "eth", name: "Ethereum", sym: "ETH", price: "4 892,10 $", chg: "+1,42 %", up: true },
  { id: "btc", name: "Bitcoin", sym: "BTC", price: "92 140,00 $", chg: "+0,76 %", up: true },
  { id: "trx", name: "Tron", sym: "TRX", price: "0,3820 $", chg: "−0,31 %", up: false },
  { id: "sol", name: "Solana", sym: "SOL", price: "214,60 $", chg: "+2,10 %", up: true },
];

const Spark = ({ up }: { up: boolean }) => (
  <svg viewBox="0 0 90 28" className="h-7 w-[90px]" fill="none" preserveAspectRatio="none" aria-hidden>
    <path
      d={up ? "M0 23 L18 18 L36 20 L54 11 L72 13 L90 4" : "M0 6 L18 11 L36 9 L54 15 L72 12 L90 22"}
      stroke={up ? "hsl(var(--primary))" : "#E5484D"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Markets = () => {
  const [lang] = useLang();
  return (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] border-collapse text-left">
      <thead>
        <tr className="border-b text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <th className="py-3 pr-4 font-semibold">{lang === "en" ? "Asset" : "Actif"}</th>
          <th className="py-3 pr-4 text-right font-semibold">{lang === "en" ? "Price (CAD)" : "Cours (CAD)"}</th>
          <th className="py-3 pr-4 text-right font-semibold">24 h</th>
          <th className="hidden py-3 pr-4 sm:table-cell">{lang === "en" ? "7 days" : "7 jours"}</th>
          <th className="py-3 text-right font-semibold" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="group border-b transition-colors hover:bg-secondary/40">
            <td className="py-[18px] pr-4">
              <div className="flex items-center gap-3">
                <Coin id={r.id} size={30} />
                <div>
                  <p className="text-sm font-semibold leading-tight">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.sym}</p>
                </div>
                {r.tradable && (
                  <span className="ml-1 rounded bg-accent-tint px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">
                    {lang === "en" ? "Available" : "Disponible"}
                  </span>
                )}
              </div>
            </td>
            <td className="py-[18px] pr-4 text-right font-display text-sm font-bold tabular-nums">
              {r.price}
            </td>
            <td
              className={`py-[18px] pr-4 text-right text-sm font-semibold tabular-nums ${r.up ? "text-primary" : "text-[#E5484D]"}`}
            >
              {r.chg}
            </td>
            <td className="hidden py-[18px] pr-4 sm:table-cell">
              <Spark up={r.up} />
            </td>
            <td className="py-[18px] text-right">
              {r.tradable ? (
                <Link
                  to="/inscription"
                  className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[hsl(174_58%_33%)]"
                >
                  {lang === "en" ? "Buy" : "Acheter"} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">{lang === "en" ? "indicative" : "à titre indicatif"}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  );
};

export default Markets;
