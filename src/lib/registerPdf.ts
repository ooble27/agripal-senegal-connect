/**
 * Registre de conformité en PDF : lisible partout (téléphone compris),
 * imprimable, prêt à remettre au CANAFE. Chaque registre a ses colonnes
 * principales ; tous les autres champs de la ligne figurent juste dessous,
 * pour que le PDF contienne exactement les mêmes informations que le CSV.
 */
import type { RegisterKind } from "@/lib/complianceLive";

type Row = Record<string, unknown>;

const TITLES: Record<RegisterKind, string> = {
  operations: "Registre des opérations",
  identites: "Registre des vérifications d'identité",
  interac: "Registre des virements Interac reçus",
  envois: "Registre des envois d'USDT",
  declarations: "Registre des déclarations CANAFE",
  alertes: "Registre des alertes et classements",
};

/** Colonnes du tableau ; les autres champs passent en ligne de détail. */
const MAIN: Record<RegisterKind, string[]> = {
  operations: ["date", "reference", "type", "client", "montant_cad", "montant_usdt", "taux", "statut"],
  identites: ["date", "client", "courriel", "type_compte", "type_document", "statut", "verifie_le"],
  interac: ["recu_le", "reference_interac", "expediteur", "montant_cad", "commande", "authentifie", "statut"],
  envois: ["date", "commande", "reseau", "montant_usdt", "statut", "declenchement"],
  declarations: ["creee_le", "reference", "type", "client", "montant_cad", "statut", "echeance", "soumise_le"],
  alertes: ["creee_le", "reference", "type", "client", "montant_cad", "statut", "classement"],
};

const LABELS: Record<string, string> = {
  date: "Date", reference: "Référence", type: "Type", statut: "Statut", client: "Client", courriel: "Courriel",
  type_compte: "Compte", identite: "Identité", montant_cad: "Montant CAD", montant_usdt: "Montant USDT", taux: "Taux",
  frais_cad: "Frais CAD", reseau: "Réseau", adresse_portefeuille: "Adresse du portefeuille", courriel_interac: "Courriel Interac",
  expediteur_interac: "Expéditeur Interac", reference_interac: "Réf. Interac", hash_transaction: "Hash de transaction",
  paiement_recu_le: "Paiement reçu le", termine_le: "Terminé le", verifie_le: "Vérifié le", fournisseur: "Fournisseur",
  reference_fournisseur: "Réf. fournisseur", type_document: "Document", note: "Note", recu_le: "Reçu le",
  expediteur: "Expéditeur", courriel_expediteur: "Courriel expéditeur", commande: "Commande", authentifie: "Authentifié",
  motif: "Motif", adresse_emettrice: "Adresse émettrice", adresse_beneficiaire: "Adresse bénéficiaire",
  declenchement: "Déclenchement", erreur: "Erreur", creee_le: "Créée le", echeance: "Échéance", soumise_le: "Soumise le",
  reference_canafe: "Réf. CANAFE", alerte: "Alerte", origine: "Origine", classement: "Classement", notes: "Notes",
  cloturee_le: "Clôturée le",
};

const VALUE_FR: Record<string, string> = {
  created: "Créée", awaiting_payment: "En attente", payment_received: "Payée", settling: "En règlement",
  completed: "Terminée", cancelled: "Annulée", expired: "Expirée", refunded: "Remboursée",
  individual: "Particulier", business: "Entreprise", not_started: "Non commencée", pending: "En cours",
  approved: "Approuvée", rejected: "Refusée", matched: "Rapproché", unmatched: "Sans commande", mismatch: "Écart",
  ignored: "Ignoré", review: "À vérifier", sending: "Envoi", broadcast: "Diffusé", confirmed: "Confirmé", failed: "Échoué",
  auto: "Automatique", staff: "Équipe", trc20: "Tron TRC20", bep20: "BNB BEP20", erc20: "Ethereum ERC20",
  polygon: "Polygon", avalanche: "Avalanche", spl: "Solana",
};

const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}/.test(s);
const two = (n: number) => String(n).padStart(2, "0");
const fmtDate = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
};

function fmt(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "number") {
    if (key === "taux") return v.toFixed(4).replace(".", ",");
    if (key.includes("usdt")) return v.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 6 }).replace(/\u202f|\u00a0/g, " ");
    if (key.includes("cad")) return v.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202f|\u00a0/g, " ");
    return String(v);
  }
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  if (isIsoDate(s)) return fmtDate(s);
  return VALUE_FR[s] ?? s;
}

export interface PdfMeta {
  kind: RegisterKind;
  rows: Row[];
  from?: string;
  to?: string;
  retentionYears: number;
}

/** Construit le PDF et le télécharge. */
export async function downloadRegisterPdf({ kind, rows, from, to, retentionYears }: PdfMeta): Promise<void> {
  const [{ jsPDF }, at] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  // Selon l'outil de build, la fonction est l'export nommé ou par défaut.
  const mod = at as unknown as { autoTable?: unknown; default?: unknown };
  let autoTable = (mod.autoTable ?? mod.default) as unknown;
  if (typeof autoTable !== "function") autoTable = (autoTable as { default?: unknown })?.default;
  const runTable = autoTable as (doc: unknown, opts: Record<string, unknown>) => void;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 36;

  const now = new Date();
  const period = from || to ? `Période : ${from ?? "début"} au ${to ?? fmtDate(now.toISOString()).slice(0, 10)}` : "Période : tout l'historique";

  // En-tête de la première page.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(TITLES[kind], M, M + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Ooble · ${period} · ${rows.length} ligne${rows.length > 1 ? "s" : ""} · Généré le ${fmtDate(now.toISOString())}`, M, M + 22);
  // Totaux de la période (montants CAD et USDT), quand le registre en a.
  const sum = (k: string) => rows.reduce((t, r) => t + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);
  const totals = [
    rows.some((r) => typeof r.montant_cad === "number") ? `Total : ${fmt("montant_cad", sum("montant_cad"))} $ CAD` : "",
    rows.some((r) => typeof r.montant_usdt === "number") ? `${fmt("montant_usdt", sum("montant_usdt"))} USDT` : "",
  ].filter(Boolean).join(" · ");
  doc.text(`Document conservé au moins ${retentionYears} ans (LRPCFAT, CANAFE).${totals ? `   ${totals}` : ""}`, M, M + 34);
  doc.setTextColor(0);

  const main = MAIN[kind];
  const keys = rows.length ? Object.keys(rows[0]) : main;
  const extra = keys.filter((k) => !main.includes(k));

  // Une ligne principale, puis une ligne de détail (tous les autres champs).
  const body: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = [];
  for (const r of rows) {
    body.push(main.map((k) => fmt(k, r[k])));
    const details = extra
      .map((k) => [LABELS[k] ?? k, fmt(k, r[k])] as const)
      .filter(([, v]) => v !== "")
      .map(([l, v]) => `${l} : ${v}`)
      .join("   ·   ");
    if (details) {
      body.push([{ content: details, colSpan: main.length, styles: { fontSize: 7, textColor: 90, cellPadding: { top: 1, right: 4, bottom: 5, left: 4 } } }]);
    }
  }

  runTable(doc, {
    startY: M + 46,
    margin: { left: M, right: M, bottom: 34 },
    head: [main.map((k) => LABELS[k] ?? k)],
    body: body.length ? body : [[{ content: "Aucune donnée sur cette période.", colSpan: main.length, styles: { halign: "center", textColor: 120 } }]],
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak", lineColor: 230, lineWidth: 0 },
    headStyles: { fillColor: [20, 20, 20], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didParseCell: (data: { section: string; cell: { raw: unknown; styles: Record<string, unknown> } }) => {
      // Les lignes principales sont séparées par un filet.
      if (data.section === "body" && typeof data.cell.raw === "string") {
        data.cell.styles.lineWidth = { top: 0.5, right: 0, bottom: 0, left: 0 };
        data.cell.styles.lineColor = 225;
      }
    },
  });

  // Pied de page : pagination sur toutes les pages.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${TITLES[kind]} · Ooble`, M, doc.internal.pageSize.getHeight() - 16);
    doc.text(`Page ${i} / ${pages}`, W - M, doc.internal.pageSize.getHeight() - 16, { align: "right" });
  }

  doc.save(`ooble-registre-${kind}-${now.toISOString().slice(0, 10)}.pdf`);
}
