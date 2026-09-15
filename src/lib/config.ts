/**
 * Paramètres d'exploitation Ooble.
 *
 * Le paiement des achats est encore manuel : le client envoie lui-même son
 * Interac e-Transfer à l'adresse ci-dessous. Le prélèvement automatique est
 * prévu mais pas encore en place — quand il le sera, cette constante ne servira
 * plus qu'au repli.
 */
export const OOBLE_INTERAC_EMAIL = "oobletechnologiesinc@gmail.com";

/**
 * Kill switch — mettre à `false` pour bloquer toute création d'ordre
 * (achat et vente). Les comptes, le KYC et la navigation restent actifs.
 * Remettre à `true` pour réactiver les transactions.
 */
export const TRADING_ENABLED = false;
