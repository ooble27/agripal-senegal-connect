/**
 * Panneau « Campagnes » du back-office.
 *
 * Design AI-first inspiré de la messagerie : l'utilisateur décrit sa
 * campagne en une phrase, l'IA génère tout le contenu (objet, headline,
 * body, CTA). Aucun formulaire long — un seul prompt, des sélecteurs
 * compacts, et un aperçu live.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Megaphone, Send, Users, Sparkles, Eye, Check, AlertTriangle,
  Loader2, Smartphone, Monitor, ArrowLeft, Building2, ShieldCheck,
  Clock, Mail, Wand2, ChevronRight, Pencil, RotateCcw, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { sendCustomEmail } from "@/lib/email";
import {
  fetchClientDirectory, type ClientDirectoryEntry,
} from "@/lib/adminClient";
import { markdownToHtml, substituteVars } from "@/lib/mailComposer";
import {
  loadCampaigns, saveCampaign, SEGMENT_LABEL, DESIGN_LABEL,
  type CampaignRecord, type CampaignSegment, type CampaignDesign,
} from "@/lib/campaigns";
import { renderCampaign } from "@/lib/campaignDesigns";
import { draftCampaign, isAIError, type DraftCampaignResult } from "@/lib/ai";
import AdminHero from "./AdminHero";
import { SubTabs } from "./AdminBits";
import { C, FONT, card, sH, inputStyle } from "./adminTheme";

type SubTab = "compose" | "history";

const dateFmt = new Intl.DateTimeFormat("fr-CA", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});

function filterBySegment(
  clients: ClientDirectoryEntry[],
  segment: CampaignSegment,
): ClientDirectoryEntry[] {
  switch (segment) {
    case "all":          return clients;
    case "kyc_approved": return clients.filter((c) => c.kycStatus === "approved");
    case "kyc_pending":  return clients.filter((c) => c.kycStatus === "pending" || c.kycStatus === "not_started");
    case "business":     return clients.filter((c) => c.accountType === "business");
    case "manual":       return [];
  }
}

const SEGMENTS: { id: CampaignSegment; icon: typeof Users; label: string }[] = [
  { id: "all",          icon: Users,       label: "Tous" },
  { id: "kyc_approved", icon: ShieldCheck, label: "KYC" },
  { id: "kyc_pending",  icon: Clock,       label: "En attente" },
  { id: "business",     icon: Building2,   label: "Entreprises" },
];

const DESIGNS: { id: CampaignDesign; color: string; accent: string }[] = [
  { id: "announcement", color: "#f4f1ea", accent: "#2FA39B" },
  { id: "promotion",    color: "#0F3A43", accent: "#7FD4C9" },
  { id: "update",       color: "#ffffff", accent: "#0F3A43" },
];

// ─── Panneau principal ───────────────────────────────────────

const CampaignsPanel = () => {
  const [tab, setTab] = useState<SubTab>("compose");
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

  useEffect(() => {
    fetchClientDirectory().then((c) => { setClients(c); setClientsLoading(false); });
    setCampaigns(loadCampaigns());
  }, []);

  const refreshHistory = () => setCampaigns(loadCampaigns());
  const successful = useMemo(
    () => campaigns.reduce((n, c) => n + c.stats.ok, 0),
    [campaigns],
  );

  const TABS = [
    { id: "compose", label: "Composer" },
    { id: "history", label: "Historique", count: campaigns.length || undefined },
  ];

  return (
    <div className="space-y-4">
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow="Campagnes"
          value={campaigns.length}
          unit={campaigns.length > 1 ? "campagnes" : "campagne"}
          stats={[
            { label: "E-mails envoyés", value: successful },
            { label: "Contacts",        value: clientsLoading ? "…" : clients.length },
          ]}
          actions={[
            { label: "Nouvelle campagne", icon: Megaphone, primary: true, onClick: () => setTab("compose") },
          ]}
        />
      </div>

      <SubTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />

      {tab === "compose" && (
        <CampaignComposer
          clients={clients}
          clientsLoading={clientsLoading}
          onSent={() => { refreshHistory(); setTab("history"); }}
        />
      )}
      {tab === "history" && <CampaignHistory campaigns={campaigns} />}
    </div>
  );
};

export default CampaignsPanel;

// ─── Composer ────────────────────────────────────────────────

interface ComposerProps {
  clients: ClientDirectoryEntry[];
  clientsLoading: boolean;
  onSent: () => void;
}

function CampaignComposer({ clients, clientsLoading, onSent }: ComposerProps) {
  const { session } = useAuth();
  const author = session?.user?.email ?? "staff";

  const [name, setName] = useState("");
  const [segment, setSegment] = useState<CampaignSegment>("kyc_approved");
  const [design, setDesign] = useState<CampaignDesign>("announcement");

  // Generated content (AI fills these)
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [feedback, setFeedback] = useState<null | { kind: "ok" | "err"; text: string }>(null);
  const [confirming, setConfirming] = useState(false);

  // AI
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [editing, setEditing] = useState(false);

  const aiInputRef = useRef<HTMLTextAreaElement | null>(null);

  const recipients = useMemo(
    () => filterBySegment(clients, segment),
    [clients, segment],
  );

  const previewClient = recipients[0];
  const previewVars = previewClient
    ? { prenom: previewClient.firstName || "Client", email: previewClient.email }
    : { prenom: "Client", email: "client@exemple.ca" };

  const previewHtml = useMemo(() => {
    if (!headline.trim()) return null;
    const bodyHtml = markdownToHtml(substituteVars(body || "", previewVars));
    return renderCampaign(design, {
      preheader: preheader || subject || "",
      eyebrow: eyebrow || undefined,
      headline: substituteVars(headline, previewVars),
      bodyHtml,
      ctaLabel: ctaLabel || undefined,
      ctaUrl: ctaUrl || undefined,
    });
  }, [design, preheader, subject, eyebrow, headline, body, ctaLabel, ctaUrl, previewVars]);

  const canSend = subject.trim().length > 0
    && headline.trim().length > 0
    && body.trim().length > 0
    && recipients.length > 0;

  const generateWithAI = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;
    setAiLoading(true);
    setFeedback(null);

    const res = await draftCampaign({
      intention: prompt,
      segment: SEGMENT_LABEL[segment],
      design: DESIGN_LABEL[design],
    });

    setAiLoading(false);

    if (isAIError(res)) {
      setFeedback({ kind: "err", text: res.error });
      return;
    }

    const r = res as DraftCampaignResult;
    setSubject(r.subject);
    setPreheader(r.preheader);
    setEyebrow(r.eyebrow);
    setHeadline(r.headline);
    setBody(r.body);
    setCtaLabel(r.ctaLabel);
    setCtaUrl(r.ctaUrl);
    if (!name.trim()) setName(prompt.slice(0, 60));
    setGenerated(true);
    setEditing(false);
    setFeedback({ kind: "ok", text: `Contenu généré (${r.tokens.in + r.tokens.out} tokens)` });
  }, [aiPrompt, aiLoading, segment, design, name]);

  const send = async () => {
    if (!canSend || busy) return;
    setBusy(true);
    setFeedback(null);
    setProgress({ done: 0, total: recipients.length });

    let ok = 0;
    let failed = 0;
    let lastError: string | undefined;

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const vars = { prenom: r.firstName || "Client", email: r.email };
      const subj = substituteVars(subject.trim(), vars);
      const html = renderCampaign(design, {
        preheader: preheader || subject,
        eyebrow: eyebrow || undefined,
        headline: substituteVars(headline, vars),
        bodyHtml: markdownToHtml(substituteVars(body, vars)),
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
      });

      const res = await sendCustomEmail({
        to: r.email,
        subject: subj,
        html,
        text: substituteVars(body, vars),
      });
      if (res.error) { failed += 1; lastError = res.error; }
      else ok += 1;
      setProgress({ done: i + 1, total: recipients.length });
    }

    saveCampaign({
      id: crypto.randomUUID(),
      name: name.trim() || aiPrompt.slice(0, 60),
      segment,
      design,
      subject: subject.trim(),
      preheader,
      body,
      sentAt: new Date().toISOString(),
      sentBy: author,
      stats: { total: recipients.length, ok, failed },
    });

    setBusy(false);
    setProgress(null);
    setConfirming(false);
    if (failed === 0) {
      setFeedback({ kind: "ok", text: `Campagne envoyée à ${ok} destinataires.` });
      setName(""); setSubject(""); setPreheader(""); setEyebrow("");
      setHeadline(""); setBody(""); setCtaLabel(""); setCtaUrl("");
      setAiPrompt(""); setGenerated(false); setEditing(false);
      onSent();
    } else if (ok === 0) {
      setFeedback({ kind: "err", text: lastError ?? "Échec de tous les envois." });
    } else {
      setFeedback({ kind: "err", text: `${ok} envoyés, ${failed} en échec (${lastError ?? "cause inconnue"}).` });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      {/* ─── Left: compose card ─────────────────────────── */}
      <div style={{ ...card, padding: 0, fontFamily: FONT }}>

        {/* Row 1 — Campaign name */}
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${C.bds}`,
          display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center",
        }}>
          <span style={{ fontSize: 11.5, color: C.t3, fontFamily: FONT }}>Campagne</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom interne (ex : Lancement Solana)"
            style={{ ...inputStyle, border: "none", padding: 0, background: "transparent", fontSize: 14 }}
          />
        </div>

        {/* Row 2 — Segment selector */}
        <div style={{
          padding: "12px 18px", borderBottom: `1px solid ${C.bds}`,
          display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center",
        }}>
          <span style={{ fontSize: 11.5, color: C.t3, fontFamily: FONT }}>Audience</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {SEGMENTS.map(({ id: s, icon: Icon, label }) => {
              const active = segment === s;
              const count = filterBySegment(clients, s).length;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSegment(s)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    height: 28, padding: "0 10px", borderRadius: 7,
                    background: active ? C.accentSoft : "transparent",
                    border: `1px solid ${active ? C.accentBd : C.bds}`,
                    color: active ? C.t1 : C.t2,
                    fontSize: 11.5, fontFamily: FONT, cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  <Icon style={{ width: 11, height: 11 }} strokeWidth={1.7} />
                  {label}
                  <span style={{
                    fontSize: 10, color: active ? C.t2 : C.t3,
                    background: active ? "rgba(255,255,255,0.05)" : C.l3,
                    padding: "1px 5px", borderRadius: 4,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {clientsLoading ? "…" : count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3 — Design selector */}
        <div style={{
          padding: "12px 18px", borderBottom: `1px solid ${C.bds}`,
          display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center",
        }}>
          <span style={{ fontSize: 11.5, color: C.t3, fontFamily: FONT }}>Design</span>
          <div style={{ display: "flex", gap: 6 }}>
            {DESIGNS.map(({ id: d, color, accent }) => {
              const active = design === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDesign(d)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    height: 28, padding: "0 10px", borderRadius: 7,
                    background: active ? C.accentSoft : "transparent",
                    border: `1px solid ${active ? C.accentBd : C.bds}`,
                    color: active ? C.t1 : C.t2,
                    fontSize: 11.5, fontFamily: FONT, cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                    background: d === "promotion"
                      ? `linear-gradient(135deg, ${color}, #12474F)`
                      : color,
                    border: `1.5px solid ${accent}`,
                  }} />
                  {DESIGN_LABEL[d]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 4 — AI prompt (main area) */}
        <div style={{ position: "relative" }}>
          <div style={{
            padding: "14px 18px 10px",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <Wand2 style={{
              width: 14, height: 14, color: C.t2, marginTop: 4, flexShrink: 0,
            }} strokeWidth={1.8} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <textarea
                ref={aiInputRef}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateWithAI(); }
                }}
                placeholder="Décrivez votre campagne en quelques mots. L'IA génère l'objet, le titre, le contenu et le bouton d'action automatiquement."
                rows={4}
                style={{
                  display: "block", width: "100%", boxSizing: "border-box",
                  padding: 0, border: "none", outline: "none",
                  background: "transparent", color: C.t1,
                  fontFamily: FONT, fontSize: 14, lineHeight: 1.55,
                  resize: "none",
                }}
              />
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: 6,
              }}>
                <span style={{ fontSize: 10.5, color: C.t3 }}>
                  Entrée pour générer · Le contenu sera adapté au design {DESIGN_LABEL[design].toLowerCase()}
                </span>
                <button
                  type="button"
                  onClick={generateWithAI}
                  disabled={!aiPrompt.trim() || aiLoading}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    height: 28, padding: "0 12px", borderRadius: 7, border: "none",
                    background: aiPrompt.trim() && !aiLoading ? C.accent : C.l3,
                    color: aiPrompt.trim() && !aiLoading ? "#111" : C.t3,
                    fontSize: 11.5, fontFamily: FONT,
                    cursor: aiPrompt.trim() && !aiLoading ? "pointer" : "default",
                    transition: "background 0.15s",
                  }}
                >
                  {aiLoading
                    ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                    : <Sparkles style={{ width: 12, height: 12 }} strokeWidth={2} />}
                  {aiLoading ? "Génération…" : "Générer"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Generated content summary (appears after AI fills fields) */}
        {generated && !editing && (
          <div style={{
            margin: "0 18px 14px", padding: "12px 14px",
            borderRadius: 10, background: "rgba(255,255,255,0.025)",
            border: `1px solid ${C.bds}`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 10,
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, color: C.t2, fontFamily: FONT,
              }}>
                <Check style={{ width: 11, height: 11, color: "#7FD4C9" }} strokeWidth={2.5} />
                Contenu généré par l'IA
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    height: 24, padding: "0 8px", borderRadius: 6,
                    background: "transparent", border: `1px solid ${C.bds}`,
                    color: C.t3, fontSize: 10.5, fontFamily: FONT, cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accentBd; e.currentTarget.style.color = C.t1; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bds; e.currentTarget.style.color = C.t3; }}
                >
                  <Pencil style={{ width: 10, height: 10 }} strokeWidth={1.7} />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={generateWithAI}
                  disabled={aiLoading}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    height: 24, padding: "0 8px", borderRadius: 6,
                    background: "transparent", border: `1px solid ${C.bds}`,
                    color: C.t3, fontSize: 10.5, fontFamily: FONT, cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accentBd; e.currentTarget.style.color = C.t1; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bds; e.currentTarget.style.color = C.t3; }}
                >
                  <RotateCcw style={{ width: 10, height: 10 }} strokeWidth={1.7} />
                  Régénérer
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <SummaryRow label="Objet" value={subject} />
              <SummaryRow label="Titre" value={headline} />
              <SummaryRow
                label="Corps"
                value={`${body.split(/\s+/).length} mots · ${body.split("\n").filter(Boolean).length} paragraphes`}
              />
              {ctaLabel && (
                <SummaryRow label="CTA" value={`${ctaLabel} → ${ctaUrl || "—"}`} />
              )}
            </div>
          </div>
        )}

        {/* Inline editor (toggled by "Modifier") */}
        {editing && (
          <div style={{
            margin: "0 18px 14px", padding: "14px",
            borderRadius: 10, background: "rgba(255,255,255,0.025)",
            border: `1px solid ${C.bds}`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 11, color: C.t2, fontFamily: FONT }}>
                Modifier le contenu
              </span>
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: "transparent", border: `1px solid ${C.bds}`,
                  color: C.t3, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.t3; }}
              >
                <X style={{ width: 10, height: 10 }} strokeWidth={2} />
              </button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <EditField label="Objet" value={subject} onChange={setSubject} />
              <EditField label="Preheader" value={preheader} onChange={setPreheader} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <EditField label="Eyebrow" value={eyebrow} onChange={setEyebrow} />
                <EditField label="Titre" value={headline} onChange={setHeadline} />
              </div>
              <EditField label="Corps" value={body} onChange={setBody} multiline />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <EditField label="Bouton" value={ctaLabel} onChange={setCtaLabel} />
                <EditField label="URL" value={ctaUrl} onChange={setCtaUrl} />
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div style={{
            margin: "0 18px 10px", padding: "8px 12px", borderRadius: 8,
            background: feedback.kind === "ok" ? "rgba(255,255,255,0.04)" : "rgba(200,60,60,0.10)",
            border: `1px solid ${feedback.kind === "ok" ? "rgba(255,255,255,0.08)" : "rgba(200,60,60,0.25)"}`,
            color: feedback.kind === "ok" ? C.t2 : "#f2c1c1",
            fontSize: 11.5, display: "flex", alignItems: "center", gap: 6,
          }}>
            {feedback.kind === "ok"
              ? <Check style={{ width: 11, height: 11 }} strokeWidth={2.5} />
              : <AlertTriangle style={{ width: 11, height: 11 }} strokeWidth={2} />}
            {feedback.text}
          </div>
        )}

        {/* Progress bar */}
        {progress && (
          <div style={{ margin: "0 18px 10px" }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 11, color: C.t2, marginBottom: 4,
            }}>
              <span>Envoi en cours…</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {progress.done} / {progress.total}
              </span>
            </div>
            <div style={{ height: 3, background: C.l3, borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(progress.done / progress.total) * 100}%`,
                background: C.accent,
                transition: "width 0.2s",
              }} />
            </div>
          </div>
        )}

        {/* Send bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px", borderTop: `1px solid ${C.bds}`,
        }}>
          <div style={{ fontSize: 11, color: C.t3, fontFamily: FONT }}>
            {recipients.length > 0 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Users style={{ width: 11, height: 11 }} strokeWidth={1.5} />
                {recipients.length} destinataire{recipients.length > 1 ? "s" : ""}
                <span style={{
                  width: 3, height: 3, borderRadius: "50%",
                  background: C.t3, opacity: 0.5,
                }} />
                {DESIGN_LABEL[design]}
              </span>
            ) : "Aucun destinataire"}
          </div>

          {confirming ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                style={{
                  height: 30, padding: "0 12px", borderRadius: 7,
                  border: `1px solid ${C.bd}`,
                  background: "transparent", color: C.t2,
                  fontSize: 11.5, fontFamily: FONT, cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={send}
                disabled={busy}
                style={{
                  height: 30, padding: "0 14px", borderRadius: 7, border: "none",
                  background: C.accent, color: "#111",
                  fontSize: 11.5, fontWeight: 500, fontFamily: FONT,
                  cursor: busy ? "default" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}
              >
                {busy
                  ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                  : <Send style={{ width: 12, height: 12 }} strokeWidth={2} />}
                Confirmer ({recipients.length})
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!canSend}
              style={{
                height: 34, padding: "0 18px", borderRadius: 8, border: "none",
                background: canSend ? C.accent : C.l3,
                color: canSend ? "#111" : C.t3,
                fontSize: 12, fontWeight: 500, fontFamily: FONT,
                display: "inline-flex", alignItems: "center", gap: 6,
                cursor: canSend ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              <Send style={{ width: 13, height: 13 }} strokeWidth={2} />
              Envoyer
            </button>
          )}
        </div>
      </div>

      {/* ─── Right: preview ─────────────────────────────── */}
      <div style={{ fontFamily: FONT, position: "sticky", top: 16, alignSelf: "start" }}>
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {/* Preview header */}
          <div style={{
            padding: "10px 16px", borderBottom: `1px solid ${C.bds}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.t2,
            }}>
              <Eye style={{ width: 12, height: 12 }} strokeWidth={1.7} />
              Aperçu
            </span>
            <div style={{
              display: "inline-flex", gap: 2, padding: 2,
              background: C.l3, borderRadius: 7,
            }}>
              {([
                { mode: "desktop" as const, icon: Monitor },
                { mode: "mobile" as const, icon: Smartphone },
              ]).map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  style={{
                    height: 24, width: 28, borderRadius: 5, border: "none",
                    background: previewMode === mode ? C.l1 : "transparent",
                    color: previewMode === mode ? C.t1 : C.t3,
                    cursor: "pointer",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.12s",
                  }}
                >
                  <Icon style={{ width: 12, height: 12 }} strokeWidth={1.7} />
                </button>
              ))}
            </div>
          </div>

          {/* Preview body */}
          <div style={{
            padding: 14, background: "#e9e6df",
            minHeight: 460, maxHeight: 680, overflow: "auto",
          }}>
            {previewHtml ? (
              <div style={{
                maxWidth: previewMode === "mobile" ? 360 : "100%",
                margin: previewMode === "mobile" ? "0 auto" : "0",
                transition: "max-width 0.25s ease",
              }}>
                <iframe
                  title="Aperçu campagne"
                  srcDoc={previewHtml}
                  style={{
                    width: "100%", height: 600, border: "none", borderRadius: 10,
                    background: "#fff",
                    boxShadow: "0 8px 32px -8px rgba(20,20,20,0.14)",
                  }}
                />
              </div>
            ) : (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                height: 360, textAlign: "center", padding: 24,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "rgba(0,0,0,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 12,
                }}>
                  <Sparkles style={{ width: 20, height: 20, color: "#8a97a0" }} strokeWidth={1.5} />
                </div>
                <div style={{
                  fontSize: 13, color: "#6b7280", fontFamily: FONT, lineHeight: 1.5,
                }}>
                  Décrivez votre campagne et laissez
                  <br />l'IA générer le contenu.
                </div>
                <div style={{
                  fontSize: 11, color: "#9ca3af", marginTop: 6, fontFamily: FONT,
                }}>
                  L'aperçu apparaitra ici automatiquement.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── History ─────────────────────────────────────────────────

function CampaignHistory({ campaigns }: { campaigns: CampaignRecord[] }) {
  const [selected, setSelected] = useState<CampaignRecord | null>(null);

  if (campaigns.length === 0) {
    return (
      <div style={{ ...card, padding: 48, textAlign: "center", fontFamily: FONT }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: C.l3,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <Megaphone style={{ width: 20, height: 20, color: C.t3 }} strokeWidth={1.6} />
        </div>
        <p style={{ fontSize: 13, color: C.t2, margin: 0 }}>
          Aucune campagne envoyée
        </p>
        <p style={{ fontSize: 11.5, color: C.t3, margin: "4px 0 0" }}>
          Les campagnes apparaitront ici avec leurs statistiques.
        </p>
      </div>
    );
  }

  if (selected) {
    const bodyHtml = renderCampaign(selected.design, {
      preheader: selected.preheader || selected.subject,
      headline: selected.subject,
      bodyHtml: markdownToHtml(selected.body),
    });
    const successRate = selected.stats.total > 0
      ? Math.round((selected.stats.ok / selected.stats.total) * 100) : 0;

    return (
      <div style={{ fontFamily: FONT }}>
        <div style={{ ...card, marginBottom: 10 }}>
          <div style={{
            padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "transparent", border: `1px solid ${C.bds}`,
                color: C.t2, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.color = C.t1; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bds; e.currentTarget.style.color = C.t2; }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} strokeWidth={1.8} />
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: C.t1, fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em" }}>
                {selected.name}
              </div>
              <div style={{
                color: C.t3, fontSize: 11, marginTop: 2,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>{dateFmt.format(new Date(selected.sentAt))}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.t3, opacity: 0.5 }} />
                <span>{DESIGN_LABEL[selected.design]}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.t3, opacity: 0.5 }} />
                <span>{SEGMENT_LABEL[selected.segment]}</span>
              </div>
            </div>
          </div>

          <div style={{
            padding: "12px 18px", borderTop: `1px solid ${C.bds}`,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
          }}>
            <Metric label="Cible" value={selected.stats.total} />
            <Metric label="Envoyés" value={selected.stats.ok} />
            <Metric label="Échecs" value={selected.stats.failed} />
            <Metric label="Réussite" value={`${successRate}%`} />
          </div>
        </div>

        <div style={{ ...card, padding: 14, background: "#e9e6df", borderRadius: 14 }}>
          <iframe
            title="Aperçu"
            srcDoc={bodyHtml}
            style={{
              width: "100%", height: 600, border: "none", borderRadius: 10,
              background: "#fff",
              boxShadow: "0 8px 32px -8px rgba(20,20,20,0.14)",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...card, fontFamily: FONT }}>
      {campaigns.map((c, i) => {
        const successRate = c.stats.total > 0
          ? Math.round((c.stats.ok / c.stats.total) * 100) : 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c)}
            style={{
              display: "flex", width: "100%", alignItems: "center", gap: 12,
              padding: "14px 18px", textAlign: "left",
              borderBottom: i < campaigns.length - 1 ? `1px solid ${C.bds}` : "none",
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: FONT, transition: "background 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: c.design === "promotion"
                ? "linear-gradient(135deg, #0F3A43, #12474F)"
                : c.design === "announcement" ? "#f4f1ea" : "#ffffff",
              border: `1px solid ${C.bds}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Megaphone style={{
                width: 13, height: 13,
                color: c.design === "promotion" ? "#7FD4C9" : "#0F3A43",
              }} strokeWidth={1.7} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13, color: C.t1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {c.name}
              </div>
              <div style={{
                fontSize: 11, color: C.t3, marginTop: 2,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>{SEGMENT_LABEL[c.segment].split(" ")[0]}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.t3, opacity: 0.5 }} />
                <span>{c.stats.ok}/{c.stats.total}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{
                padding: "3px 8px", borderRadius: 6,
                background: successRate === 100 ? "rgba(255,255,255,0.05)" : "rgba(200,60,60,0.08)",
                fontSize: 11, fontWeight: 500,
                color: successRate === 100 ? C.t2 : "#e8a0a0",
                fontVariantNumeric: "tabular-nums",
              }}>
                {successRate}%
              </div>
              <div style={{
                fontSize: 10.5, color: C.t3,
                fontVariantNumeric: "tabular-nums", minWidth: 80, textAlign: "right",
              }}>
                {dateFmt.format(new Date(c.sentAt))}
              </div>
              <ChevronRight style={{ width: 14, height: 14, color: C.t3 }} strokeWidth={1.5} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Small components ────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span style={{
        fontSize: 10.5, color: C.t3, fontFamily: FONT,
        minWidth: 40, textAlign: "right", paddingTop: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 12, color: C.t1, fontFamily: FONT,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        minWidth: 0, flex: 1,
      }}>
        {value}
      </span>
    </div>
  );
}

function EditField({
  label, value, onChange, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const shared: React.CSSProperties = {
    ...inputStyle, fontSize: 13,
    background: "rgba(255,255,255,0.03)",
  };
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 10.5, color: C.t3, marginBottom: 4, fontFamily: FONT }}>
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          style={{ ...shared, resize: "vertical", lineHeight: 1.55 }}
        />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={shared} />
      )}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{
        fontSize: 10, color: C.t3, letterSpacing: "0.12em",
        textTransform: "uppercase", fontFamily: FONT, marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        color: C.t1, fontSize: 20, fontWeight: 300,
        letterSpacing: "-0.01em", fontFamily: FONT,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
    </div>
  );
}
