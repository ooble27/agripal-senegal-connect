/**
 * Paramètres d'exploitation Ooble.
 *
 * Le paiement des achats est encore manuel : le client envoie lui-même son
 * Interac e-Transfer à l'adresse ci-dessous. Le prélèvement automatique est
 * prévu mais pas encore en place — quand il le sera, cette constante ne servira
 * plus qu'au repli.
 */
export const OOBLE_INTERAC_EMAIL = "interac@ooble.ca";

export const OOBLE_SUPPORT_EMAIL = "support@ooble.ca";

/**
 * Kill switch — mettre à `false` pour bloquer toute création d'ordre
 * (achat et vente). Les comptes, le KYC et la navigation restent actifs.
 * Remettre à `true` pour réactiver les transactions.
 */
export const TRADING_ENABLED = false;

/**
 * Interrupteur des vérifications (identité et entreprise) — à `false`, le
 * bouton pour commencer une vérification reste désactivé. Remettre à `true`
 * au lancement des activités.
 */
export const VERIFICATION_ENABLED = false;

/**
 * Comptes autorisés à faire la vérification d'entreprise avant le lancement
 * (aperçu interne du parcours). Identifiants de compte (profiles.id).
 */
export const KYB_PREVIEW_USERS: string[] = [
  "8e6697db-4484-4c5d-8744-777d8001f148", // Ooble Technologies (Mohamed Lo)
];
