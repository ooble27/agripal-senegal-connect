import { nfCad, type AdminOrder } from "./adminOrders";

// ────────────────────────────────────────────────────────────
// Seuils réglementaires — CANAFE / LRPCFAT / RRPCFAT
// ────────────────────────────────────────────────────────────

export const DOIMV_THRESHOLD = 10_000;
export const TRAVEL_RULE_THRESHOLD = 1_000;
export const DOIMV_DEADLINE_DAYS = 15;
export const DOT_DEADLINE_DAYS = 30;
export const DOT_TERROR_DEADLINE_DAYS = 3;
export const RECORD_RETENTION_YEARS = 5;

// ────────────────────────────────────────────────────────────
// Alertes de conformité
// ────────────────────────────────────────────────────────────

export type AlertType = "doimv" | "doimv_24h" | "dot" | "voyage" | "ppv" | "sanctions";
export type AlertStatus = "nouveau" | "en_cours" | "declare" | "classe";

export const ALERT_TYPE_META: Record<AlertType, { label: string; critical: boolean }> = {
  doimv:     { label: "DOIMV",         critical: false },
  doimv_24h: { label: "DOIMV (24 h)",  critical: false },
  dot:       { label: "DOT",           critical: true },
  voyage:    { label: "Règle voyage",  critical: false },
  ppv:       { label: "PPV / DOI",     critical: false },
  sanctions: { label: "Sanctions",     critical: true },
};

export const ALERT_STATUS_META: Record<AlertStatus, { label: string; text: string }> = {
  nouveau:  { label: "Nouveau",  text: "text-foreground" },
  en_cours: { label: "En cours", text: "text-foreground" },
  declare:  { label: "Déclaré",  text: "text-muted-foreground/60" },
  classe:   { label: "Classé",   text: "text-muted-foreground/60" },
};

export interface ComplianceAlert {
  id: string;
  type: AlertType;
  orderRef?: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  reason: string;
  createdAt: string;
  status: AlertStatus;
  assignedTo?: string;
  notes?: string;
}

// ────────────────────────────────────────────────────────────
// Déclarations CANAFE
// ────────────────────────────────────────────────────────────

export type DeclarationType = "doimv" | "dot" | "dbt";
export type DeclarationStatus = "brouillon" | "soumise" | "acceptee" | "rejetee";

export const DECL_TYPE_META: Record<DeclarationType, { label: string; full: string }> = {
  doimv: { label: "DOIMV", full: "Déclaration d'opérations importantes en monnaie virtuelle" },
  dot:   { label: "DOT",   full: "Déclaration d'opérations douteuses" },
  dbt:   { label: "DBT",   full: "Déclaration de biens terroristes" },
};

export const DECL_STATUS_META: Record<DeclarationStatus, { label: string; text: string }> = {
  brouillon: { label: "Brouillon", text: "text-foreground" },
  soumise:   { label: "Soumise",   text: "text-foreground" },
  acceptee:  { label: "Acceptée",  text: "text-muted-foreground/60" },
  rejetee:   { label: "Rejetée",   text: "text-destructive" },
};

export interface ComplianceDeclaration {
  id: string;
  type: DeclarationType;
  alertId: string;
  clientName: string;
  amount: number;
  createdAt: string;
  dueDate: string;
  submittedAt?: string;
  status: DeclarationStatus;
  canafRef?: string;
  formData?: DeclarationFormData;
}

// ────────────────────────────────────────────────────────────
// Catégories de dossiers (tenue de dossiers)
// ────────────────────────────────────────────────────────────

export interface RecordCategory {
  id: string;
  label: string;
  count: number;
  description: string;
}

export const RECORD_CATEGORIES: RecordCategory[] = [
  { id: "tx",             label: "Transactions",              count: 247, description: "Relevés d'opérations en monnaie virtuelle (achats, ventes, envois)." },
  { id: "kyc",            label: "Vérifications d'identité",  count: 89,  description: "Documents d'identification, résultats de vérification, attestations." },
  { id: "beneficiaire",   label: "Bénéficiaires effectifs",   count: 12,  description: "Déclarations de bénéficiaires effectifs (comptes entreprise)." },
  { id: "ppv",            label: "Filtrage PPV / DOI",        count: 89,  description: "Résultats de filtrage des personnes politiquement vulnérables et dirigeants d'OI." },
  { id: "sanctions",      label: "Filtrage sanctions",        count: 89,  description: "Résultats de filtrage des listes de sanctions économiques." },
  { id: "declarations",   label: "Déclarations CANAFE",       count: 3,   description: "Copies des DOIMV, DOT et DBT soumises au CANAFE." },
  { id: "correspondance", label: "Correspondance",            count: 34,  description: "Échanges avec le CANAFE, demandes de renseignements." },
  { id: "formation",      label: "Registre formation",        count: 5,   description: "Attestations de formation du personnel en conformité." },
];

// ────────────────────────────────────────────────────────────
// Programme de conformité — liste de contrôle
// ────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  description: string;
  done: boolean;
  dueDate?: string;
  frequency?: string;
}

export const CHECKLIST_CATEGORIES = [
  "Inscription CANAFE",
  "Agent de conformité",
  "Politiques et procédures",
  "Évaluation des risques",
  "Formation du personnel",
  "Examen indépendant",
  "Contrôles continus",
] as const;

export const SEED_CHECKLIST: ChecklistItem[] = [
  { id: "P01", category: "Inscription CANAFE",       label: "Inscription comme ESM",                description: "Inscription ou renouvellement auprès du CANAFE en tant qu'entreprise de services monétaires opérant en monnaie virtuelle.", done: true, frequency: "Tous les 2 ans" },
  { id: "P02", category: "Inscription CANAFE",       label: "Déclaration de changements",           description: "Signaler tout changement important (adresse, dirigeants, services offerts) dans les 30 jours.",                          done: true, frequency: "Au besoin" },

  { id: "P03", category: "Agent de conformité",      label: "Nomination de l'agent",                description: "Désigner nommément un agent de conformité responsable de la mise en oeuvre du programme.",                                done: true },
  { id: "P04", category: "Agent de conformité",      label: "Mandat et pouvoirs documentés",         description: "Documenter le mandat, les pouvoirs et les responsabilités de l'agent de conformité.",                                    done: false },

  { id: "P05", category: "Politiques et procédures", label: "Programme de conformité écrit",         description: "Rédiger et maintenir un programme de conformité complet couvrant toutes les obligations LRPCFAT.",                       done: false },
  { id: "P06", category: "Politiques et procédures", label: "Procédure KYC",                        description: "Procédure de vérification de l'identité des clients (pièce d'identité, biométrie, tiers autorisés).",                   done: true },
  { id: "P07", category: "Politiques et procédures", label: "Procédure de tenue de dossiers",       description: "Procédure de conservation des documents et relevés pendant 5 ans.",                                                     done: false },
  { id: "P08", category: "Politiques et procédures", label: "Procédure de déclaration",             description: "Procédure de préparation et soumission des DOIMV, DOT et DBT au CANAFE.",                                               done: false },
  { id: "P09", category: "Politiques et procédures", label: "Procédure de filtrage des sanctions",  description: "Procédure de vérification des clients contre les listes de sanctions du Canada.",                                       done: true },
  { id: "P10", category: "Politiques et procédures", label: "Procédure PPV / DOI",                  description: "Procédure de détermination des personnes politiquement vulnérables et dirigeants d'organisations internationales.",      done: true },
  { id: "P11", category: "Politiques et procédures", label: "Procédure règle de voyage",            description: "Procédure de transmission des informations de l'expéditeur et du destinataire pour les transferts >= 1 000 $ CA.",       done: false },

  { id: "P12", category: "Évaluation des risques",   label: "Évaluation initiale des risques",      description: "Effectuer une évaluation des risques de BA/FT propres à vos activités, clientèle et zones géographiques.",               done: false, dueDate: "2026-09-30" },
  { id: "P13", category: "Évaluation des risques",   label: "Mise à jour de l'évaluation",          description: "Réviser l'évaluation des risques au moins une fois par an ou lors de changements significatifs.",                        done: false, frequency: "Annuel", dueDate: "2027-07-01" },

  { id: "P14", category: "Formation du personnel",   label: "Formation initiale",                   description: "Former tout le personnel sur les obligations LRPCFAT, la détection d'opérations douteuses et les procédures internes.",  done: false, dueDate: "2026-09-15" },
  { id: "P15", category: "Formation du personnel",   label: "Formation continue",                   description: "Sessions de mise à jour annuelles couvrant les changements réglementaires et les nouvelles typologies.",                 done: false, frequency: "Annuel" },
  { id: "P16", category: "Formation du personnel",   label: "Registre de formation",                description: "Tenir un registre de toutes les formations : dates, participants, contenu couvert.",                                     done: false },

  { id: "P17", category: "Examen indépendant",       label: "Examen biennal",                       description: "Faire examiner l'efficacité du programme de conformité par un tiers indépendant tous les deux ans.",                     done: false, frequency: "Tous les 2 ans", dueDate: "2028-07-01" },
  { id: "P18", category: "Examen indépendant",       label: "Plan d'action correctif",              description: "Mettre en oeuvre les recommandations issues de l'examen indépendant.",                                                   done: false },

  { id: "P19", category: "Contrôles continus",       label: "Filtrage des sanctions en continu",     description: "Vérifier chaque client et opération contre les listes de sanctions canadiennes et internationales.",                     done: true, frequency: "Continu" },
  { id: "P20", category: "Contrôles continus",       label: "Filtrage PPV / DOI en continu",         description: "Déterminer si un client est une PPV nationale ou étrangère, un DOI, ou un membre de leur famille / proche.",              done: true, frequency: "Continu" },
  { id: "P21", category: "Contrôles continus",       label: "Surveillance des opérations",           description: "Surveiller les opérations pour détecter les seuils (DOIMV >= 10 000 $) et les comportements suspects.",                  done: true, frequency: "Continu" },
  { id: "P22", category: "Contrôles continus",       label: "Mise à jour des dossiers clients",      description: "Vérifier que les informations des clients sont à jour, particulièrement avant les opérations.",                          done: true, frequency: "Continu" },
];

// ────────────────────────────────────────────────────────────
// Données de démonstration — Alertes
// ────────────────────────────────────────────────────────────

export const SEED_ALERTS: ComplianceAlert[] = [
  {
    id: "CA-001",
    type: "doimv",
    orderRef: "OOB-9D8W3N",
    clientName: "Catherine Pelletier",
    clientEmail: "cath.p@gmail.com",
    amount: 12_500,
    reason: "Transaction d'achat unique de 12 500 $ CA — seuil DOIMV de 10 000 $ atteint (art. 12 RRPCFAT).",
    createdAt: "2026-07-28",
    status: "nouveau",
  },
  {
    id: "CA-002",
    type: "doimv_24h",
    clientName: "David Roy",
    clientEmail: "davidroy88@gmail.com",
    amount: 11_200,
    reason: "Trois transactions en 24 h totalisant 11 200 $ CA — règle des 24 heures déclenchée.",
    createdAt: "2026-07-30",
    status: "nouveau",
  },
  {
    id: "CA-003",
    type: "dot",
    clientName: "Vincent Ouellet",
    clientEmail: "vince.o@hotmail.com",
    amount: 9_800,
    reason: "Tentative de structuration suspectée : quatre dépôts de 2 450 $ CA en 48 h, juste sous le seuil de 10 000 $.",
    createdAt: "2026-07-25",
    status: "en_cours",
    notes: "Le client a annulé la dernière opération après questionnement.",
  },
  {
    id: "CA-004",
    type: "ppv",
    clientName: "Hugo Bouchard",
    clientEmail: "hugo.bouchard@gmail.com",
    amount: 220,
    reason: "Le filtrage PPV / DOI a retourné une correspondance partielle — vérification manuelle requise.",
    createdAt: "2026-07-31",
    status: "nouveau",
  },
  {
    id: "CA-005",
    type: "doimv",
    orderRef: "OOB-8B4K5F",
    clientName: "Nicolas Fortin",
    clientEmail: "n.fortin@proton.me",
    amount: 10_340,
    reason: "Cumul client sur 24 h : 10 340 $ CA (vente de 3 400 USDT + achat précédent) — seuil DOIMV atteint.",
    createdAt: "2026-08-01",
    status: "nouveau",
  },
];

// ────────────────────────────────────────────────────────────
// Données de démonstration — Déclarations
// ────────────────────────────────────────────────────────────

export const SEED_DECLARATIONS: ComplianceDeclaration[] = [
  {
    id: "DC-001",
    type: "doimv",
    alertId: "CA-001",
    clientName: "Catherine Pelletier",
    amount: 12_500,
    createdAt: "2026-07-28",
    dueDate: "2026-08-12",
    status: "brouillon",
  },
  {
    id: "DC-002",
    type: "dot",
    alertId: "CA-003",
    clientName: "Vincent Ouellet",
    amount: 9_800,
    createdAt: "2026-07-26",
    dueDate: "2026-08-25",
    submittedAt: "2026-07-28",
    status: "soumise",
    canafRef: "DOT-2026-00412",
  },
  {
    id: "DC-003",
    type: "doimv",
    alertId: "HIST-001",
    clientName: "Patrick Lévesque",
    amount: 15_000,
    createdAt: "2026-06-10",
    dueDate: "2026-06-25",
    submittedAt: "2026-06-14",
    status: "acceptee",
    canafRef: "DOIMV-2026-01087",
  },
];

// ────────────────────────────────────────────────────────────
// Détection automatique des seuils sur les commandes
// ────────────────────────────────────────────────────────────

export function autoFlagOrders(orders: AdminOrder[]): ComplianceAlert[] {
  const auto: ComplianceAlert[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const o of orders) {
    if (o.status === "annule") continue;
    if (o.cad >= DOIMV_THRESHOLD) {
      auto.push({
        id: `AUTO-${o.id}`,
        type: "doimv",
        orderRef: o.ref,
        clientName: o.clientName,
        clientEmail: o.clientEmail,
        amount: o.cad,
        reason: `Transaction ${o.type === "buy" ? "d'achat" : "de vente"} de ${nfCad.format(o.cad)} $ CA — seuil DOIMV atteint automatiquement.`,
        createdAt: today,
        status: "nouveau",
      });
    }
  }

  return auto;
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ────────────────────────────────────────────────────────────
// Classification — clôture d'alerte sans déclaration
// ────────────────────────────────────────────────────────────

export const CLASSIFICATION_REASONS = [
  "Faux positif — le client ou l'opération ne présente aucun risque",
  "Information insuffisante pour soumettre une déclaration",
  "Doublon — déjà couvert par une autre alerte",
  "Opération annulée ou non complétée",
  "Vérification effectuée — aucun comportement suspect",
] as const;

// ────────────────────────────────────────────────────────────
// Indicateurs de soupçon DOT — CANAFE / GAFI
// ────────────────────────────────────────────────────────────

export const DOT_INDICATORS = [
  "Le client refuse ou hésite à fournir des renseignements d'identification",
  "Le client fournit des documents d'identification douteux ou falsifiés",
  "Structuration apparente pour éviter le seuil de déclaration de 10 000 $",
  "Transactions sans justification économique apparente",
  "Opérations incohérentes avec le profil financier du client",
  "Le client effectue des opérations pour le compte d'un tiers non déclaré",
  "Le client est pressé de compléter l'opération sans se soucier du taux ou des frais",
  "Le client utilise plusieurs comptes, adresses courriel ou identités",
  "Provenance des fonds suspecte ou inexpliquée",
  "Destination des fonds vers une juridiction à haut risque (liste GAFI)",
  "Le client tente d'annuler l'opération après avoir été questionné",
  "Le client est lié à des informations médiatiques négatives (adverse media)",
  "Montant ou fréquence incompatible avec la source de revenus déclarée",
  "Le client refuse d'expliquer l'objet de la transaction",
] as const;

// ────────────────────────────────────────────────────────────
// Référentiels pour le formulaire de déclaration
// ────────────────────────────────────────────────────────────

export const ID_TYPES = [
  "Permis de conduire",
  "Passeport canadien",
  "Passeport étranger",
  "Carte de résident permanent",
  "Carte de citoyenneté",
  "Certificat de statut d'Indien",
  "Carte d'identité provinciale",
] as const;

export const PROVINCES: { code: string; name: string }[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "Colombie-Britannique" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "Nouveau-Brunswick" },
  { code: "NL", name: "Terre-Neuve-et-Labrador" },
  { code: "NS", name: "Nouvelle-Écosse" },
  { code: "NT", name: "Territoires du Nord-Ouest" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Île-du-Prince-Édouard" },
  { code: "QC", name: "Québec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

// ────────────────────────────────────────────────────────────
// Données du formulaire de déclaration CANAFE
// ────────────────────────────────────────────────────────────

export interface DeclarationFormData {
  type: DeclarationType;
  clientName: string;
  clientEmail: string;
  clientDob: string;
  clientIdType: string;
  clientIdNumber: string;
  clientAddress: string;
  clientCity: string;
  clientProvince: string;
  clientPostalCode: string;
  clientOccupation: string;
  operationType: string;
  amountCad: string;
  amountUsdt: string;
  operationDate: string;
  paymentMethod: string;
  walletAddress: string;
  network: string;
  suspicionIndicators: string[];
  observations: string;
}

export function initialDeclarationForm(alert: ComplianceAlert): DeclarationFormData {
  const declType: DeclarationType =
    alert.type === "dot" ? "dot" : alert.type === "sanctions" ? "dbt" : "doimv";
  return {
    type: declType,
    clientName: alert.clientName,
    clientEmail: alert.clientEmail,
    clientDob: "",
    clientIdType: "",
    clientIdNumber: "",
    clientAddress: "",
    clientCity: "",
    clientProvince: "",
    clientPostalCode: "",
    clientOccupation: "",
    operationType: "buy",
    amountCad: String(alert.amount),
    amountUsdt: "",
    operationDate: alert.createdAt,
    paymentMethod: "Interac e-Transfer",
    walletAddress: "",
    network: "",
    suspicionIndicators: [],
    observations: "",
  };
}
