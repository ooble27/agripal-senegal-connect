/** Réseaux sur lesquels recevoir/envoyer des USDT (USDT uniquement). */
export type NetId = "trx" | "bnb" | "eth" | "matic" | "sol" | "avax";

export interface Network {
  id: NetId;
  name: string;
  tag: string;
}

export const NETWORKS: Network[] = [
  { id: "trx", name: "Tron", tag: "TRC20" },
  { id: "bnb", name: "BNB Chain", tag: "BEP20" },
  { id: "eth", name: "Ethereum", tag: "ERC20" },
  { id: "matic", name: "Polygon", tag: "Polygon" },
  { id: "sol", name: "Solana", tag: "SOL" },
  { id: "avax", name: "Avalanche", tag: "C-Chain" },
];
