import { useEffect, useState } from "react";
import { Building2, Check, ChevronLeft, ExternalLink, Eye, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { decideKyb, fetchKyb, getKybDocumentUrl, resetKyb, type KybRequest } from "@/lib/adminKyb";
import type { KybDocKey, OwnerRole } from "@/lib/kyb";
import { useAuth } from "@/lib/auth";
import { ClientCell, SubTabs } from "./AdminBits";
import AdminHero from "./AdminHero";
import BusinessMark from "@/components/app/BusinessMark";

type Filter = "pending" | "approved" | "rejected";

const DOC_LABELS: Record<KybDocKey, string> = {
  incorporation: "Constitution",
  registry: "Registre des administrateurs",
  address_proof: "Preuve d'adresse",
};
const ROLE_LABELS: Record<OwnerRole, string> = {
  director: "Administrateur",
  owner: "Propriétaire",
  both: "Administrateur et propriétaire",
};
const STATUS_LABEL: Record<string, string> = {
  not_started: "Non commencée",
  pending: "En attente",
  approved: "Vérifiée",
  rejected: "Refusée",
};

/** Une date seule (« 1990-04-12 ») est lue en heure locale, pas en UTC (sinon la veille s'affiche). */
const fmtDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(iso);
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
};

const Row = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div className="flex items-start gap-4 px-4 py-2.5">
    <span className="w-[38%] shrink-0 text-[12.5px] text-muted-foreground">{label}</span>
    <span className={cn("min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px]", mono && "font-mono")}>{value || "—"}</span>
  </div>
);

const StatusPill = ({ status }: { status: string }) => (
  <span
    className={cn(
      "whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
      status === "approved" ? "bg-primary/10 text-primary" : status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground/80",
    )}
  >
    {STATUS_LABEL[status] ?? status}
  </span>
);

const BusinessKycPanel = () => {
  const { roles } = useAuth();
  const canDecide = roles.includes("admin") || roles.includes("kyc_reviewer");
  const isAdmin = roles.includes("admin");
  const [resetStep, setResetStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [rows, setRows] = useState<KybRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Filter>("pending");
  const [detail, setDetail] = useState<KybRequest | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchKyb().then((r) => { setRows(r); setLoading(false); });
  useEffect(() => { load(); }, []);

  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  const openDoc = async (path: string) => {
    const w = window.open("", "_blank");
    const url = await getKybDocumentUrl(path);
    if (w && url) w.location.href = url;
    else w?.close();
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (!detail) return;
    if (decision === "rejected" && !note.trim()) {
      setError("Expliquez au client ce qu'il doit corriger.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await decideKyb(detail, decision, note);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    const updated = { ...detail, status: decision, reviewNote: note.trim() || null, reviewedAt: new Date().toISOString() };
    setRows((rs) => rs.map((r) => (r.id === detail.id ? updated : r)));
    setDetail(updated);
  };

  const reset = async () => {
    if (!detail) return;
    setResetStep("busy");
    setError(null);
    const res = await resetKyb(detail.userId, { businessStatus: detail.status, businessName: detail.legalName });
    setResetStep("idle");
    if (res.error) { setError(res.error); return; }
    setRows((rs) => rs.filter((r) => r.userId !== detail.userId));
    setDetail(null);
  };

  /* ── Dossier ── */
  if (detail) {
    const d = detail;
    const owned = d.owners.reduce((s, o) => s + (o.role === "director" ? 0 : Number(o.ownership) || 0), 0);
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => { setDetail(null); setError(null); setResetStep("idle"); }}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Retour à la liste
        </button>

        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4">
          <BusinessMark name={d.legalName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{d.legalName}</p>
            <p className="truncate text-[12px] text-muted-foreground">{d.contactName} · {d.email}</p>
          </div>
          <StatusPill status={d.status} />
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <Row label="Immatriculation" value={d.jurisdiction} />
          <Row label="NEQ / BN" value={d.businessNumber} mono />
          <Row label="Adresse du siège" value={d.address} />
          <Row label="Téléphone" value={d.phone} />
          <Row label="Site web" value={d.website} />
          <Row label="Activité" value={d.activity} />
          <Row label="Soumis le" value={fmtDate(d.createdAt)} />
          <Row label="Identité du responsable" value={<StatusPill status={d.contactKyc} />} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Administrateurs et propriétaires ({d.owners.length})
            </span>
            <span className="text-[11.5px] text-muted-foreground">Parts déclarées : {owned} %</span>
          </div>
          <div className="divide-y divide-border">
            {d.owners.map((o, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-4 py-2.5 md:grid-cols-[1.4fr_1.2fr_0.6fr_1fr]">
                <span className="text-[13px] font-medium">{o.name}</span>
                <span className="text-right text-[12.5px] text-muted-foreground md:text-left">{ROLE_LABELS[o.role] ?? o.role}</span>
                <span className="text-[12.5px] text-muted-foreground">{o.role === "director" ? "—" : `${o.ownership} %`}</span>
                <span className="text-right text-[12.5px] text-muted-foreground md:text-left">
                  {o.birthDate ? fmtDate(o.birthDate) : "—"} · {o.country}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Documents</div>
          <div className="divide-y divide-border">
            {(Object.keys(DOC_LABELS) as KybDocKey[]).map((k) => (
              <div key={k} className="flex items-center gap-3 px-4 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
                <span className="flex-1 text-[13px]">{DOC_LABELS[k]}</span>
                {d.documents[k] ? (
                  <button
                    type="button"
                    onClick={() => openDoc(d.documents[k]!)}
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-foreground hover:underline"
                  >
                    Ouvrir <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-[12.5px] text-muted-foreground">Non fourni</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {d.status !== "pending" && d.reviewNote && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Note envoyée au client</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px]">{d.reviewNote}</p>
          </div>
        )}

        {isAdmin && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 px-1">
            {resetStep === "confirm" ? (
              <>
                <span className="mr-auto text-[12.5px] text-muted-foreground">
                  Supprimer ce dossier ? Le client repartira d'un dossier vide.
                </span>
                <button type="button" onClick={() => setResetStep("idle")} className="rounded-[9px] px-3 py-[7px] text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
                  Annuler
                </button>
                <button type="button" onClick={reset} className="rounded-[9px] bg-destructive px-3 py-[7px] text-[12.5px] font-semibold text-destructive-foreground hover:opacity-90">
                  Réinitialiser
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={resetStep === "busy"}
                onClick={() => { setError(null); setResetStep("confirm"); }}
                className="rounded-[9px] border border-border px-3 py-[7px] text-[12.5px] font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {resetStep === "busy" ? "Réinitialisation…" : "Réinitialiser la vérification"}
              </button>
            )}
          </div>
        )}
        {d.status !== "pending" && error && <p className="px-1 text-right text-[12.5px] text-destructive">{error}</p>}

        {d.status === "pending" && canDecide && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <label className="block">
              <span className="text-[12.5px] text-muted-foreground">Note au client (obligatoire en cas de refus)</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex. : le registre des administrateurs fourni date de plus d'un an."
                className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] outline-none focus-visible:border-foreground/50"
              />
            </label>
            {d.contactKyc !== "approved" && (
              <p className="mt-2 text-[12px] text-muted-foreground">
                L'identité du responsable n'est pas encore vérifiée ({STATUS_LABEL[d.contactKyc].toLowerCase()}).
              </p>
            )}
            {error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>}
            <div className="mt-3 flex justify-end gap-2.5">
              <Button variant="appOutline" shape="rounded" className="h-auto gap-1.5 rounded-[9px] px-4 py-[8px] text-[13px]" disabled={busy} onClick={() => decide("rejected")}>
                <X className="h-[14px] w-[14px]" /> Refuser
              </Button>
              <Button variant="appSolid" shape="rounded" className="h-auto gap-1.5 rounded-[9px] px-4 py-[8px] text-[13px] font-bold" disabled={busy} onClick={() => decide("approved")}>
                <Check className="h-[14px] w-[14px]" /> Approuver
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Liste ── */
  const list = rows.filter((r) => r.status === tab);
  const cols = "grid grid-cols-[1fr_auto] md:grid-cols-[1.5fr_1.3fr_0.8fr_auto] items-center gap-3";
  return (
    <div className="space-y-4">
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow="Vérifications d'entreprise"
          loading={loading}
          value={counts.pending}
          unit="en attente"
          stats={[
            { label: "Vérifiées", value: counts.approved },
            { label: "Refusées", value: counts.rejected },
            { label: "Total", value: rows.length },
          ]}
        />
      </div>

      <SubTabs
        tabs={[
          { id: "pending", label: "À examiner", count: counts.pending },
          { id: "approved", label: "Vérifiées", count: counts.approved },
          { id: "rejected", label: "Refusées", count: counts.rejected },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Filter)}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className={cn(cols, "hidden border-b border-border px-4 py-2.5 md:grid")}>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Responsable</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Entreprise</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Soumis</span>
          <span />
        </div>
        {list.map((r, i) => (
          <div key={r.id} className={cn(cols, "px-4 py-2.5", i < list.length - 1 && "border-b border-border")}>
            <ClientCell name={r.contactName} email={r.email} />
            <span className="hidden truncate text-[13px] md:block">{r.legalName}</span>
            <span className="hidden text-[12.5px] text-muted-foreground md:block">{fmtDate(r.createdAt)}</span>
            <div className="flex justify-end">
              <Button
                variant="appOutline"
                shape="rounded"
                className="h-auto gap-1.5 rounded-[9px] px-3 py-[7px] text-[12.5px]"
                onClick={() => { setDetail(r); setNote(""); setError(null); }}
              >
                <Eye className="h-[13px] w-[13px]" /> {r.status === "pending" && canDecide ? "Examiner" : "Voir"}
              </Button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Building2 className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-3 text-[13px] text-muted-foreground">{loading ? "Chargement…" : "Aucun dossier ici."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessKycPanel;
