/**
 * Ooble — Moteur de score de risque client (Feature #27, V1).
 *
 * Calcul déterministe côté client à partir des données déjà présentes dans
 * `ClientProfile`. Aucun appel réseau, aucune nouvelle table : le score se
 * (re)calcule instantanément à chaque ouverture d'une fiche client.
 *
 * V1 délibérément conservatrice sur les données disponibles :
 *   - statut KYC (manquant / refusé = risque)
 *   - volume cumulé (attention CANAFE au-delà de 10 000 $)
 *   - type de compte (entreprise = diligence renforcée mais pas « risque » en soi)
 *   - ancienneté (client établi = risque plus faible pour un même profil)
 *
 * V2 (une fois `client_risk_signals` créé) ajoutera :
 *   - PPV (personne politiquement vulnérable)
 *   - Pays de résidence (liste GAFI)
 *   - Résultat screening sanctions
 *   - Écarts entre déclarations et pratiques
 *
 * Le score est un entier 0-100. Plus il est haut, plus le client demande
 * de vigilance. Le calcul est pur : `score(profile) === score(profile)`.
 */
import type { ClientProfile } from "@/lib/adminClient";

/** Niveau de risque avec libellés bilingues (pour l'affichage). */
export type RiskLevel = "low" | "medium" | "high" | "critical";

export const RISK_LEVEL: Record<RiskLevel, { fr: string; en: string; band: [number, number] }> = {
  low:      { fr: "Faible",     en: "Low",      band: [0, 30] },
  medium:   { fr: "Modéré",     en: "Medium",   band: [31, 60] },
  high:     { fr: "Élevé",      en: "High",     band: [61, 84] },
  critical: { fr: "Très élevé", en: "Critical", band: [85, 100] },
};

/**
 * Un facteur contribuant au score, exposé pour que l'UI puisse expliquer
 * *pourquoi* un client a tel score (transparence essentielle en conformité).
 */
export interface RiskFactor {
  /** Libellé court affiché dans la matrice (« KYC non vérifié », « Volume > 10 k$ »). */
  label: string;
  /** Contribution au score (positive = ajoute du risque, négative = enlève). */
  delta: number;
  /** Détail lisible expliquant d'où vient ce facteur. */
  hint: string;
}

export interface RiskAssessment {
  /** Score final entre 0 et 100 (arrondi). */
  score: number;
  level: RiskLevel;
  /** Liste des facteurs, ordre : plus impactant → moins impactant (valeur absolue). */
  factors: RiskFactor[];
}

/** Renvoie le niveau correspondant à un score numérique. */
export function levelForScore(score: number): RiskLevel {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  if (score <= 84) return "high";
  return "critical";
}

/**
 * Calcule le score de risque d'un client à partir des données de son profil.
 * Pure, sans dépendance : appelable partout, testable trivialement.
 */
export function assessClient(p: ClientProfile): RiskAssessment {
  const factors: RiskFactor[] = [];

  // ─── Base pour tout client ─────────────────────────────
  factors.push({
    label: "Base",
    delta: 10,
    hint: "Score de départ appliqué à tout compte, indépendamment du profil.",
  });

  // ─── Statut KYC ─────────────────────────────────────────
  if (p.kycStatus === "pending" || p.kycStatus === "not_started") {
    factors.push({
      label: "KYC non finalisé",
      delta: 25,
      hint: "L'identité n'est pas encore confirmée : aucune opération ne devrait passer sans vérification.",
    });
  } else if (p.kycStatus === "rejected") {
    factors.push({
      label: "KYC refusé",
      delta: 55,
      hint: "L'identité a été refusée par la vérification. Toute activité future est à considérer avec prudence.",
    });
  } else if (p.kycStatus === "approved") {
    factors.push({
      label: "KYC vérifié",
      delta: -10,
      hint: "L'identité a été vérifiée avec succès. Risque de base réduit.",
    });
  }

  // ─── Volume cumulé ──────────────────────────────────────
  // Les seuils CANAFE structurent la vigilance : 10 000 $ CAD déclenche
  // les obligations de déclaration d'opération importante.
  if (p.totalCad >= 100_000) {
    factors.push({
      label: "Volume > 100 k$",
      delta: 25,
      hint: "Client à haut volume : justifie une revue périodique et une vigilance renforcée.",
    });
  } else if (p.totalCad >= 10_000) {
    factors.push({
      label: "Volume > 10 k$",
      delta: 12,
      hint: "Franchit le seuil CANAFE de déclaration d'opération importante. Traçabilité renforcée.",
    });
  }

  // Volume élevé sans KYC vérifié = combinaison à risque
  const kycOk = p.kycStatus === "approved";
  if (!kycOk && p.totalCad >= 10_000) {
    factors.push({
      label: "Volume élevé sans KYC",
      delta: 30,
      hint: "Un client sans KYC vérifié dépasse le seuil CANAFE : à bloquer en priorité.",
    });
  }

  // ─── Fréquence : client établi ─────────────────────────
  if (p.orderCount >= 10 && kycOk) {
    factors.push({
      label: "Client établi",
      delta: -12,
      hint: "10 commandes ou plus avec KYC vérifié : historique de comportement conforme.",
    });
  }

  // ─── Type de compte ────────────────────────────────────
  if (p.accountType === "business") {
    factors.push({
      label: "Compte entreprise",
      delta: 8,
      hint: "Les comptes entreprise requièrent la vérification des bénéficiaires effectifs (partie 5 des Conditions).",
    });
  }

  const raw = factors.reduce((s, f) => s + f.delta, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  factors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { score, level: levelForScore(score), factors };
}
