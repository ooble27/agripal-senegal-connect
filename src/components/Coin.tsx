import { cn } from "@/lib/utils";

export type CoinId = "usdt" | "trx" | "eth" | "bnb" | "matic" | "sol" | "usdc" | "btc" | "avax";

const NAMES: Record<CoinId, string> = {
  usdt: "Tether",
  trx: "Tron",
  eth: "Ethereum",
  bnb: "BNB",
  matic: "Polygon",
  sol: "Solana",
  usdc: "USD Coin",
  btc: "Bitcoin",
  avax: "Avalanche",
};

interface CoinProps {
  id: CoinId;
  size?: number;
  className?: string;
}

/** Logo crypto officiel (bundlé depuis cryptocurrency-icons). */
const Coin = ({ id, size = 32, className }: CoinProps) => (
  <img
    src={`/coins/${id}.svg`}
    width={size}
    height={size}
    alt={NAMES[id]}
    loading="lazy"
    className={cn("inline-block select-none", className)}
    style={{ width: size, height: size }}
    draggable={false}
  />
);

export default Coin;
