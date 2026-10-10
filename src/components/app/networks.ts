/** Réseaux sur lesquels recevoir/envoyer des USDT (USDT uniquement). */
export type NetId = "trx" | "bnb" | "eth" | "matic" | "sol" | "avax";

export interface Network {
  id: NetId;
  name: string;
  tag: string;
  /** Retiré : plus proposé pour un nouvel ordre, gardé pour afficher les anciens. */
  retired?: true;
}

export const NETWORKS: Network[] = [
  { id: "trx", name: "Tron", tag: "TRC20" },
  { id: "bnb", name: "BNB Chain", tag: "BEP20" },
  { id: "eth", name: "Ethereum", tag: "ERC20", retired: true },
  { id: "matic", name: "Polygon", tag: "Polygon" },
  { id: "sol", name: "Solana", tag: "SOL" },
  { id: "avax", name: "Avalanche", tag: "C-Chain", retired: true },
];

/** Réseaux proposés pour un nouvel ordre (Ethereum et Avalanche retirés : frais
 *  d'envoi trop élevés ou trop peu demandés). */
export const ORDER_NETWORKS: Network[] = NETWORKS.filter((n) => !n.retired);
