# Ooble

Une plateforme web pour acheter et vendre des USDT en dollars canadiens (CAD).

## Modèle : non-custodial, ordre par ordre

Ooble ne détient **jamais** les fonds des clients et ne gère **aucun solde** sur la plateforme. Chaque transaction est un ordre atomique :

- **Achat** : le client paie en CAD (Interac e-Transfer) → Ooble envoie les USDT directement sur l'adresse wallet fournie par le client.
- **Vente** : le client envoie ses USDT vers l'adresse de dépôt d'Ooble → une fois la transaction confirmée on-chain, Ooble envoie le paiement CAD au client.

Un ordre passe par les statuts : `created → awaiting_payment → payment_received → settling → completed` (ou `cancelled` / `expired`).

## Stack technique

- **Frontend** : Vite + React + TypeScript + Tailwind CSS (compatible shadcn/ui)
- **Backend** : Supabase (PostgreSQL, Auth, Edge Functions)
- **KYC** : fournisseur tiers (à intégrer — Persona / SumSub / Veriff)
- **Paiements CAD** : Interac e-Transfer
- **USDT** : livraison directe on-chain vers le wallet du client

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour l'architecture complète.

## Démarrage

```sh
npm install
npm run dev
```

Copier `.env.example` vers `.env` et renseigner les clés Supabase.

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement (port 8080) |
| `npm run build` | Build de production |
| `npm run lint` | Lint du code |
| `npm run test` | Tests (Vitest) |

## Conformité

⚠️ L'exploitation d'un service d'échange fiat ↔ crypto au Canada requiert une inscription comme **entreprise de services monétaires (ESM/MSB)** auprès de **FINTRAC**, même en modèle non-custodial. Le KYC est obligatoire avant toute transaction. Voir la section conformité dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
