import { useEffect, useState } from "react";
import { Check, X, ScanFace, Eye, ChevronLeft, IdCard, User, FileCheck, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KYC_STATUS_META, timeAgo, type KycRequest, type KycStatus } from "@/lib/adminOrders";
import { fetchKyc, setKycStatus, getDocumentUrl } from "@/lib/adminKyc";
import { ClientCell, SubTabs } from "./AdminBits";
import AdminHero from "./AdminHero";
import { C, FONT, card } from "./adminTheme";

const KycBadge = ({ status }: { status: KycStatus }) => {
  const m = KYC_STATUS_META[status];
  return <span className={cn("whitespace-nowrap text-[13px] font-semibold", m.text)}>{m.label}</span>;
};

const DOC_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  id_front: { label: "Recto", icon: IdCard },
  id_back: { label: "Verso", icon: FileCheck },
  selfie: { label: "Selfie", icon: User },
};

const DOC_ORDER = ["selfie", "id_front", "id_back"];

type Filter = "attente" | "verifie" | "refuse";

const KycPanel = () => {
  const [rows, setRows] = useState<KycRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Filter>("attente");
  const [detail, setDetail] = useState<KycRequest | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

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

  /* ── Lightbox ── */
  if (lightbox) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
        onClick={() => setLightbox(null)}
      >
        <img
          src={lightbox}
          alt=""
          style={{ maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8 }}
        />
        <button
          type="button"
          onClick={() => setLightbox(null)}
          style={{
            position: "absolute", top: 20, right: 20,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.1)", border: "none",
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>
    );
  }

  /* ── Detail view ── */
  if (detail) {
    const m = KYC_STATUS_META[detail.status];
    const sortedKeys = detail.documentPaths
      ? DOC_ORDER.filter((k) => k in detail.documentPaths!)
      : [];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button
          type="button"
          onClick={() => setDetail(null)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: C.t2, fontSize: 13, fontFamily: FONT,
            padding: 0, transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.t2; }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} /> Retour à la liste
        </button>

        {/* Client header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 18px",
          ...card,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: C.l2, border: `1px solid ${C.bds}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.t2, fontSize: 16, fontFamily: FONT,
            flexShrink: 0,
          }}>
            {detail.clientName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: C.t1, fontSize: 15, fontFamily: FONT }}>{detail.clientName}</p>
            <p style={{ margin: "2px 0 0", color: C.t3, fontSize: 12, fontFamily: FONT }}>{detail.email}</p>
          </div>
          <span style={{
            fontSize: 11, fontFamily: FONT,
            color: m.text.includes("green") || detail.status === "verifie" ? "#4ade80" : detail.status === "refuse" ? "#f87171" : C.t2,
            padding: "4px 10px",
            borderRadius: 20,
            background: detail.status === "verifie" ? "rgba(74,222,128,0.1)" : detail.status === "refuse" ? "rgba(248,113,113,0.1)" : C.l3,
          }}>
            {m.label}
          </span>
        </div>

        {/* Doc info bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 18px",
          borderRadius: 10,
          background: C.l2,
          fontSize: 12, fontFamily: FONT,
        }}>
          <span style={{ color: C.t3 }}>Document :</span>
          <span style={{ color: C.t1, fontWeight: 500 }}>{detail.docType || "—"}</span>
          <span style={{ marginLeft: "auto", color: C.t3 }}>{timeAgo(detail.submittedMinsAgo)}</span>
        </div>

        {/* Documents */}
        {detail.documentPaths ? (
          loadingUrls ? (
            <div style={{
              textAlign: "center", padding: "48px 0",
              color: C.t3, fontSize: 13, fontFamily: FONT,
            }}>
              Chargement des documents…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sortedKeys.map((key) => {
                const meta = DOC_LABELS[key] ?? { label: key, icon: FileCheck };
                const url = docUrls[key];
                return (
                  <div key={key} style={{ ...card, overflow: "hidden" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 16px",
                      borderBottom: `1px solid ${C.bds}`,
                    }}>
                      <meta.icon style={{ width: 14, height: 14, color: C.t3 }} strokeWidth={1.7} />
                      <span style={{ color: C.t2, fontSize: 12, fontFamily: FONT, flex: 1 }}>{meta.label}</span>
                      {url && (
                        <button
                          type="button"
                          onClick={() => setLightbox(url)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: C.t3, display: "flex", alignItems: "center", gap: 4,
                            fontSize: 11, fontFamily: FONT, padding: 0,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = C.t3; }}
                        >
                          <ZoomIn style={{ width: 12, height: 12 }} /> Agrandir
                        </button>
                      )}
                    </div>
                    {url ? (
                      <div
                        style={{
                          cursor: "pointer", background: C.bg,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 12,
                        }}
                        onClick={() => setLightbox(url)}
                      >
                        <img
                          src={url}
                          alt={meta.label}
                          style={{
                            maxWidth: "100%", maxHeight: 360,
                            objectFit: "contain", borderRadius: 6,
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "48px 0", color: C.t3, fontSize: 12, fontFamily: FONT,
                      }}>
                        Indisponible
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div style={{
            ...card, padding: "48px 0",
            display: "flex", flexDirection: "column",
            alignItems: "center", textAlign: "center",
          }}>
            <ScanFace style={{ width: 24, height: 24, color: C.t3 }} strokeWidth={1.5} />
            <p style={{ margin: "10px 0 0", color: C.t3, fontSize: 13, fontFamily: FONT }}>
              Aucun document uploadé (ancien flux Sumsub).
            </p>
          </div>
        )}

        {/* Action buttons */}
        {detail.status === "attente" && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
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
