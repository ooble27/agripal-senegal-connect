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
/** Desk OTC (gros volumes) : arrive dans Admin → Messagerie, pastille « OTC ». */
export const OOBLE_OTC_EMAIL = "otc@ooble.ca";

/**
 * Kill switch — mettre à `false` pour bloquer toute création d'ordre
 * (achat et vente). Les comptes, le KYC et la navigation restent actifs.
 * Remettre à `true` pour réactiver les transactions.
 */
export const TRADING_ENABLED = false;

/**
 * Desk OTC (gros volumes). La page publique /otc est visible par tous. Tant
 * que `false`, le formulaire de demande (/app/otc) et ses raccourcis ne sont
 * accessibles qu'à l'équipe Ooble (staff). `true` : ouvert aux clients.
 */
export const OTC_ENABLED = false;

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

/**
 * Achats et ventes : limites sur le montant en CAD (mêmes règles en base,
 * voir la migration 20261007030000_flat_rate_sell_limits.sql, qui fait
 * autorité). Achats et ventes sont comptés séparément.
 *   • 100 $ minimum par ordre ;
 *   • 9 999 $ au total sur 24 heures glissantes (sous le seuil CANAFE).
 * Le taux est le même quel que soit le montant.
 */
export const TRADE_MIN_CAD = 100;
/**
 * Minimum pour l'équipe Ooble (admin, opérateur) : petits achats de test du
 * règlement automatique. La base laisse déjà passer les ordres du staff.
 */
export const STAFF_TEST_MIN_CAD = 10;
export const TRADE_DAILY_MAX_CAD = 9999;
