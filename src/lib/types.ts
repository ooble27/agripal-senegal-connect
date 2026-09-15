// Types du domaine Ooble — modèle non-custodial, ordre par ordre.

export type OrderSide = "buy" | "sell";

export type OrderStatus =
  | "created"
  | "awaiting_payment"
  | "payment_received"
  | "settling"
  | "completed"
  | "cancelled"
  | "expired";

export type UsdtNetwork = "trc20" | "erc20";

export type KycStatus = "not_started" | "pending" | "approved" | "rejected";

export interface Order {
  id: string;
  userId: string;
  side: OrderSide;
  cadAmount: number;
  usdtAmount: number;
  /** Taux CAD par USDT, verrouillé à la création de l'ordre. */
  lockedRate: number;
  feeCad: number;
  network: UsdtNetwork;
  /** Achat : adresse wallet du client. Vente : adresse de dépôt Ooble. */
  walletAddress: string;
  /** Vente : courriel Interac du client pour le paiement sortant. */
  interacEmail: string | null;
  status: OrderStatus;
  /** Expiration du verrouillage du taux. */
  rateLockedUntil: string;
  createdAt: string;
  updatedAt: string;
}
