import { useEffect, useState } from "react";
import { Check, X, ScanFace, Eye, ChevronLeft, IdCard, User, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KYC_STATUS_META, timeAgo, type KycRequest, type KycStatus } from "@/lib/adminOrders";
import { fetchKyc, setKycStatus, getDocumentUrl } from "@/lib/adminKyc";
import { ClientCell, SubTabs } from "./AdminBits";
import AdminHero from "./AdminHero";

const KycBadge = ({ status }: { status: KycStatus }) => {
  const m = KYC_STATUS_META[status];
  return <span className={cn("whitespace-nowrap text-[13px] font-semibold", m.text)}>{m.label}</span>;
};

const DOC_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  id_front: { label: "Recto", icon: IdCard },
  id_back: { label: "Verso", icon: FileCheck },
  selfie: { label: "Selfie", icon: User },
};

type Filter = "attente" | "verifie" | "refuse";

const KycPanel = () => {
  const [rows, setRows] = useState<KycRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Filter>("attente");
  const [detail, setDetail] = useState<KycRequest | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);

  useEffect(() => {
    fetchKyc().then((r) => { setRows(r); setLoading(false); });
  }, []);

  const set = (id: string, status: KycStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (detail?.id === id) setDetail((d) => d ? { ...d, status } : d);
    setKycStatus(id, status).then((res) => {
      if (res.error) fetchKyc().then(setRows);
    });
  };

  const openDetail = async (r: KycRequest) => {
    setDetail(r);
    setDocUrls({});
    if (!r.documentPaths) return;
    setLoadingUrls(true);
    const urls: Record<string, string> = {};
    for (const [key, path] of Object.entries(r.documentPaths)) {
      const url = await getDocumentUrl(path);
      if (url) urls[key] = url;
    }
    setDocUrls(urls);
    setLoadingUrls(false);
  };

  const counts = {
    attente: rows.filter((r) => r.status === "attente").length,
    verifie: rows.filter((r) => r.status === "verifie").length,
    refuse: rows.filter((r) => r.status === "refuse").length,
  };
  const TABS = [
    { id: "attente", label: "À vérifier", count: counts.attente },
    { id: "verifie", label: "Vérifiés", count: counts.verifie },
    { id: "refuse", label: "Refusés", count: counts.refuse },
  ];
  const list = rows.filter((r) => r.status === tab);
  const cols = "grid grid-cols-[1fr_auto] md:grid-cols-[1.7fr_1fr_0.7fr_auto] items-center gap-3";

  if (detail) {
    const m = KYC_STATUS_META[detail.status];
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setDetail(null)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Retour à la liste
        </button>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold">{detail.clientName}</p>
              <p className="truncate text-[13px] text-muted-foreground">{detail.email}</p>
            </div>
            <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", m.text)}>{m.label}</span>
          </div>
          <div className="px-5 py-3 border-b border-border flex items-center gap-3">
            <span className="text-[12px] text-muted-foreground">Document :</span>
            <span className="text-[13px] font-medium">{detail.docType}</span>
            <span className="mx-auto" />
            <span className="text-[12px] text-muted-foreground">{timeAgo(detail.submittedMinsAgo)}</span>
          </div>

          {detail.documentPaths ? (
            <div className="p-5">
              {loadingUrls ? (
                <p className="text-center text-[13px] text-muted-foreground py-8">Chargement des documents…</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(detail.documentPaths).map(([key]) => {
                    const meta = DOC_LABELS[key] ?? { label: key, icon: FileCheck };
                    const url = docUrls[key];
                    return (
                      <div key={key} className="overflow-hidden rounded-xl border border-border">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/30">
                          <meta.icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.7} />
                          <span className="text-[12px] font-semibold text-muted-foreground">{meta.label}</span>
                        </div>
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={url} alt={meta.label} className="w-full object-contain max-h-64 bg-black/5" />
                          </a>
                        ) : (
                          <div className="flex items-center justify-center py-12 text-[12px] text-muted-foreground">
                            Indisponible
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <ScanFace className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-2 text-[13px] text-muted-foreground">Aucun document uploadé (ancien flux Sumsub).</p>
            </div>
          )}
        </div>

        {detail.status === "attente" && (
          <div className="flex items-center justify-end gap-3">
            <Button variant="appOutline" shape="rounded" className="h-auto gap-1.5 rounded-[9px] px-4 py-[8px] text-[13px]" onClick={() => set(detail.id, "refuse")}>
              <X className="h-[14px] w-[14px]" /> Refuser
            </Button>
            <Button variant="appSolid" shape="rounded" className="h-auto gap-1.5 rounded-[9px] px-4 py-[8px] text-[13px] font-bold" onClick={() => set(detail.id, "verifie")}>
              <Check className="h-[14px] w-[14px]" /> Approuver
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow="Vérifications d'identité"
          loading={loading}
          value={counts.attente}
          unit={counts.attente > 1 ? "en attente" : "en attente"}
          stats={[
            { label: "Vérifiés", value: counts.verifie },
            { label: "Refusés", value: counts.refuse },
            { label: "Total", value: rows.length },
          ]}
        />
      </div>

      <SubTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as Filter)} />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className={cn(cols, "hidden border-b border-border px-4 py-2.5 md:grid")}>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Client</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Document</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Soumis</span>
          <span />
        </div>

        {list.map((r, i) => (
          <div key={r.id} className={cn(cols, "px-4 py-2.5", i < list.length - 1 && "border-b border-border")}>
            <ClientCell name={r.clientName} email={r.email} />
            <span className="hidden text-[13px] text-muted-foreground md:block">{r.docType}</span>
            <span className="hidden text-[12.5px] text-muted-foreground md:block">{timeAgo(r.submittedMinsAgo)}</span>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="appOutline"
                shape="rounded"
                className="h-auto gap-1.5 rounded-[9px] px-3 py-[7px] text-[12.5px]"
                onClick={() => openDetail(r)}
              >
                <Eye className="h-[13px] w-[13px]" /> Voir
              </Button>
              {r.status === "attente" ? (
                <>
                  <Button variant="appOutline" shape="rounded" className="h-auto gap-1.5 rounded-[9px] px-3 py-[7px] text-[12.5px]" onClick={() => set(r.id, "refuse")}>
                    <X className="h-[13px] w-[13px]" /> Refuser
                  </Button>
                  <Button variant="appSolid" shape="rounded" className="h-auto gap-1.5 rounded-[9px] px-3 py-[7px] text-[12.5px] font-bold" onClick={() => set(r.id, "verifie")}>
                    <Check className="h-[13px] w-[13px]" /> Approuver
                  </Button>
                </>
              ) : (
                <KycBadge status={r.status} />
              )}
            </div>
          </div>
        ))}

        {list.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <ScanFace className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-3 text-[13px] text-muted-foreground">
              {loading ? "Chargement…" : "Aucune vérification ici."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KycPanel;
