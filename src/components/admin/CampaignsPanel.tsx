/**
 * Panneau « Campagnes » du back-office — outil broadcast marketing.
 *
 * Design AI-first : l'utilisateur décrit sa campagne en une phrase,
 * l'IA génère tout le contenu. Le RecipientPicker permet d'envoyer
 * à n'importe quel e-mail (clients existants + saisie libre).
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Megaphone, Send, Users, Sparkles, Eye, Check, AlertTriangle,
  Loader2, Smartphone, Monitor, ArrowLeft, Building2, ShieldCheck,
  Clock, Mail, Wand2, ChevronRight, Pencil, RotateCcw, X,
  User, UserPlus, Zap, Target, BarChart3, TrendingUp, Hash,
  Globe, AtSign, Plus, Layers,
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

// ─── Types ──────────────────────────────────────────────────

type SubTab = "compose" | "history";

interface Recipient {
  id?: string;
  email: string;
  firstName: string;
  fullName: string;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function manualRecipient(email: string): Recipient {
  const local = email.split("@")[0] ?? "";
  const first = (local.split(/[.\-_]/)[0] || "").replace(/^./, (c) => c.toUpperCase());
  return { email, firstName: first, fullName: first };
}

function recipientFromClient(c: ClientDirectoryEntry): Recipient {
  return { id: c.id, email: c.email, firstName: c.firstName, fullName: c.fullName };
}

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
  { id: "all",          icon: Globe,       label: "Tous" },
  { id: "kyc_approved", icon: ShieldCheck, label: "KYC approuvés" },
  { id: "kyc_pending",  icon: Clock,       label: "En attente" },
  { id: "business",     icon: Building2,   label: "Entreprises" },
];

const DESIGNS: { id: CampaignDesign; color: string; accent: string }[] = [
  { id: "announcement", color: "#f4f1ea", accent: "#2FA39B" },
  { id: "promotion",    color: "#0F3A43", accent: "#7FD4C9" },
  { id: "update",       color: "#ffffff", accent: "#0F3A43" },
];

// ─── Panneau principal ──────────────────────────────────────

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
  const totalSent = useMemo(
    () => campaigns.reduce((n, c) => n + c.stats.total, 0),
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
            { label: "Taux de succès", value: totalSent > 0 ? `${Math.round((successful / totalSent) * 100)}%` : "—" },
            { label: "Contacts", value: clientsLoading ? "…" : clients.length },
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

// ─── Composer ───────────────────────────────────────────────

interface ComposerProps {
  clients: ClientDirectoryEntry[];
  clientsLoading: boolean;
  onSent: () => void;
}

function CampaignComposer({ clients, clientsLoading, onSent }: ComposerProps) {
  const { session } = useAuth();
  const author = session?.user?.email ?? "staff";

  const [name, setName] = useState("");
  const [design, setDesign] = useState<CampaignDesign>("announcement");

  // Recipients (hybrid: segment quick-add + manual emails)
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const addRecipient = useCallback((r: Recipient) => {
    setRecipients((prev) => {
      if (prev.some((p) => p.email.toLowerCase() === r.email.toLowerCase())) return prev;
      return [...prev, r];
    });
  }, []);

  const removeRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((r) => r.email.toLowerCase() !== email.toLowerCase()));
  }, []);

  const addSegment = useCallback((seg: CampaignSegment) => {
    const filtered = filterBySegment(clients, seg);
    setRecipients((prev) => {
      const existing = new Set(prev.map((r) => r.email.toLowerCase()));
      const newOnes = filtered
        .filter((c) => !existing.has(c.email.toLowerCase()))
        .map(recipientFromClient);
      return [...prev, ...newOnes];
    });
  }, [clients]);

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

    const segmentHint = recipients.length > 0
      ? `${recipients.length} destinataires sélectionnés`
      : "audience générale";

    const res = await draftCampaign({
      intention: prompt,
      segment: segmentHint,
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
  }, [aiPrompt, aiLoading, design, name, recipients.length]);

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
      segment: "manual",
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
      setFeedback({ kind: "ok", text: `Campagne envoyée à ${ok} destinataire${ok > 1 ? "s" : ""}.` });
      setName(""); setSubject(""); setPreheader(""); setEyebrow("");
      setHeadline(""); setBody(""); setCtaLabel(""); setCtaUrl("");
      setAiPrompt(""); setGenerated(false); setEditing(false);
      setRecipients([]);
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

        {/* Section header — Campaign */}
        <SectionHeader icon={Megaphone} label="Campagne" />

        {/* Row 1 — Campaign name */}
        <div style={{
          padding: "10px 18px", borderBottom: `1px solid ${C.bds}`,
          display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, color: C.t3, fontFamily: FONT, display: "flex", alignItems: "center", gap: 5 }}>
            <Hash style={{ width: 10, height: 10 }} strokeWidth={1.7} />
            Nom
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom interne (ex : Lancement Solana)"
            style={{ ...inputStyle, border: "none", padding: 0, background: "transparent", fontSize: 13.5 }}
          />
        </div>

        {/* Section header — Audience */}
        <SectionHeader icon={Target} label="Audience" />

        {/* Row 2 — RecipientPicker */}
        <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.bds}` }}>
          <CampaignRecipientPicker
            selected={recipients}
            clients={clients}
            loading={clientsLoading}
            onAdd={addRecipient}
            onRemove={removeRecipient}
          />

          {/* Segment quick-add buttons */}
          <div style={{
            display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8,
            paddingTop: 8, borderTop: `1px solid rgba(255,255,255,0.03)`,
          }}>
            <span style={{ fontSize: 10, color: C.t3, fontFamily: FONT, marginRight: 4, lineHeight: "26px" }}>
              Ajouter un segment :
            </span>
            {SEGMENTS.map(({ id: s, icon: Icon, label }) => {
              const count = filterBySegment(clients, s).length;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSegment(s)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    height: 26, padding: "0 9px", borderRadius: 7,
                    background: "transparent",
                    border: `1px solid ${C.bds}`,
                    color: C.t3,
                    fontSize: 10.5, fontFamily: FONT, cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accentBd; e.currentTarget.style.color = C.t1; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bds; e.currentTarget.style.color = C.t3; }}
                >
                  <Plus style={{ width: 9, height: 9 }} strokeWidth={2} />
                  <Icon style={{ width: 10, height: 10 }} strokeWidth={1.7} />
                  {label}
                  <span style={{
                    fontSize: 9.5, color: C.t3, opacity: 0.7,
                    background: C.l3, padding: "1px 4px", borderRadius: 3,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {clientsLoading ? "…" : count}
                  </span>
                </button>
              );
            })}
            {recipients.length > 0 && (
              <button
                type="button"
                onClick={() => setRecipients([])}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  height: 26, padding: "0 9px", borderRadius: 7,
                  background: "transparent",
                  border: `1px solid rgba(200,60,60,0.2)`,
                  color: "rgba(200,100,100,0.6)",
                  fontSize: 10.5, fontFamily: FONT, cursor: "pointer",
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,60,60,0.4)"; e.currentTarget.style.color = "#e8a0a0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,60,60,0.2)"; e.currentTarget.style.color = "rgba(200,100,100,0.6)"; }}
              >
                <X style={{ width: 9, height: 9 }} strokeWidth={2} />
                Vider
              </button>
            )}
          </div>
        </div>

        {/* Section header — Design */}
        <SectionHeader icon={Layers} label="Design" />

        {/* Row 3 — Design selector */}
        <div style={{
          padding: "10px 18px", borderBottom: `1px solid ${C.bds}`,
          display: "flex", gap: 6,
        }}>
          {DESIGNS.map(({ id: d, color, accent }) => {
            const active = design === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDesign(d)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  height: 30, padding: "0 12px", borderRadius: 8,
                  background: active ? C.accentSoft : "transparent",
                  border: `1px solid ${active ? C.accentBd : C.bds}`,
                  color: active ? C.t1 : C.t2,
                  fontSize: 11.5, fontFamily: FONT, cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 5, flexShrink: 0,
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

        {/* Section header — AI Content */}
        <SectionHeader icon={Wand2} label="Contenu IA" />

        {/* Row 4 — AI prompt (main area) */}
        <div style={{ padding: "12px 18px" }}>
          <div style={{
            position: "relative",
            borderRadius: 10,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${C.bds}`,
            padding: "12px 14px",
            transition: "border-color 0.15s",
          }}>
            <textarea
              ref={aiInputRef}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateWithAI(); }
              }}
              placeholder="Décrivez votre campagne en quelques mots — l'IA génère le contenu complet (objet, titre, corps, bouton d'action) automatiquement."
              rows={3}
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
              marginTop: 8, paddingTop: 8, borderTop: `1px solid rgba(255,255,255,0.04)`,
            }}>
              <span style={{ fontSize: 10.5, color: C.t3, display: "flex", alignItems: "center", gap: 4 }}>
                <Sparkles style={{ width: 10, height: 10 }} strokeWidth={1.5} />
                Entrée pour générer · Design : {DESIGN_LABEL[design]}
              </span>
              <button
                type="button"
                onClick={generateWithAI}
                disabled={!aiPrompt.trim() || aiLoading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  height: 30, padding: "0 14px", borderRadius: 8, border: "none",
                  background: aiPrompt.trim() && !aiLoading ? C.accent : C.l3,
                  color: aiPrompt.trim() && !aiLoading ? "#111" : C.t3,
                  fontSize: 11.5, fontWeight: 500, fontFamily: FONT,
                  cursor: aiPrompt.trim() && !aiLoading ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
              >
                {aiLoading
                  ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                  : <Zap style={{ width: 12, height: 12 }} strokeWidth={2} />}
                {aiLoading ? "Génération…" : "Générer"}
              </button>
            </div>
          </div>
        </div>

        {/* Generated content summary */}
        {generated && !editing && (
          <div style={{
            margin: "0 18px 14px", padding: "14px 16px",
            borderRadius: 10, background: "rgba(255,255,255,0.025)",
            border: `1px solid ${C.bds}`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 11.5, color: C.t2, fontFamily: FONT,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: "rgba(127,212,201,0.1)",
                  border: "1px solid rgba(127,212,201,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Check style={{ width: 10, height: 10, color: "#7FD4C9" }} strokeWidth={2.5} />
                </div>
                Contenu généré par l'IA
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <SmallAction icon={Pencil} label="Modifier" onClick={() => setEditing(true)} />
                <SmallAction icon={RotateCcw} label="Régénérer" onClick={generateWithAI} disabled={aiLoading} />
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <SummaryRow icon={Mail} label="Objet" value={subject} />
              <SummaryRow icon={Megaphone} label="Titre" value={headline} />
              <SummaryRow
                icon={BarChart3}
                label="Corps"
                value={`${body.split(/\s+/).length} mots · ${body.split("\n").filter(Boolean).length} paragraphes`}
              />
              {ctaLabel && (
                <SummaryRow icon={Zap} label="CTA" value={`${ctaLabel} → ${ctaUrl || "—"}`} />
              )}
            </div>
          </div>
        )}

        {/* Inline editor (toggled by "Modifier") */}
        {editing && (
          <div style={{
            margin: "0 18px 14px", padding: "16px",
            borderRadius: 10, background: "rgba(255,255,255,0.025)",
            border: `1px solid ${C.bds}`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 14,
            }}>
              <span style={{
                fontSize: 11.5, color: C.t2, fontFamily: FONT,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <Pencil style={{ width: 10, height: 10 }} strokeWidth={1.7} />
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
            background: feedback.kind === "ok" ? "rgba(127,212,201,0.06)" : "rgba(200,60,60,0.10)",
            border: `1px solid ${feedback.kind === "ok" ? "rgba(127,212,201,0.15)" : "rgba(200,60,60,0.25)"}`,
            color: feedback.kind === "ok" ? "#7FD4C9" : "#f2c1c1",
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
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Send style={{ width: 10, height: 10 }} strokeWidth={1.7} />
                Envoi en cours…
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {progress.done} / {progress.total}
              </span>
            </div>
            <div style={{ height: 3, background: C.l3, borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(progress.done / progress.total) * 100}%`,
                background: "linear-gradient(90deg, #7FD4C9, #2FA39B)",
                transition: "width 0.2s",
              }} />
            </div>
          </div>
        )}

        {/* Send bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderTop: `1px solid ${C.bds}`,
        }}>
          <div style={{ fontSize: 11, color: C.t3, fontFamily: FONT }}>
            {recipients.length > 0 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Target style={{ width: 11, height: 11 }} strokeWidth={1.5} />
                {recipients.length} destinataire{recipients.length > 1 ? "s" : ""}
                <span style={{
                  width: 3, height: 3, borderRadius: "50%",
                  background: C.t3, opacity: 0.5,
                }} />
                {DESIGN_LABEL[design]}
                {recipients.filter((r) => !r.id).length > 0 && (
                  <>
                    <span style={{
                      width: 3, height: 3, borderRadius: "50%",
                      background: C.t3, opacity: 0.5,
                    }} />
                    <AtSign style={{ width: 10, height: 10 }} strokeWidth={1.5} />
                    {recipients.filter((r) => !r.id).length} externe{recipients.filter((r) => !r.id).length > 1 ? "s" : ""}
                  </>
                )}
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Users style={{ width: 11, height: 11 }} strokeWidth={1.5} />
                Aucun destinataire
              </span>
            )}
          </div>

          {confirming ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                style={{
                  height: 32, padding: "0 14px", borderRadius: 8,
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
                  height: 32, padding: "0 16px", borderRadius: 8, border: "none",
                  background: C.accent, color: "#111",
                  fontSize: 12, fontWeight: 500, fontFamily: FONT,
                  cursor: busy ? "default" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}
              >
                {busy
                  ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                  : <Send style={{ width: 12, height: 12 }} strokeWidth={2} />}
                Confirmer l'envoi ({recipients.length})
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!canSend}
              style={{
                height: 36, padding: "0 20px", borderRadius: 9, border: "none",
                background: canSend ? C.accent : C.l3,
                color: canSend ? "#111" : C.t3,
                fontSize: 12.5, fontWeight: 500, fontFamily: FONT,
                display: "inline-flex", alignItems: "center", gap: 7,
                cursor: canSend ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              <Send style={{ width: 14, height: 14 }} strokeWidth={2} />
              Envoyer la campagne
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
                  width: 52, height: 52, borderRadius: 14,
                  background: "rgba(0,0,0,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                }}>
                  <Sparkles style={{ width: 22, height: 22, color: "#8a97a0" }} strokeWidth={1.5} />
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

// ─── RecipientPicker (campagnes) ────────────────────────────

interface CampaignPickerProps {
  selected: Recipient[];
  clients: ClientDirectoryEntry[];
  loading: boolean;
  onAdd: (r: Recipient) => void;
  onRemove: (email: string) => void;
}

function CampaignRecipientPicker({ selected, clients, loading, onAdd, onRemove }: CampaignPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const q = query.trim().toLowerCase();
  const selectedIds = new Set(selected.map((r) => r.email.toLowerCase()));
  const matches = q
    ? clients
        .filter((c) => !selectedIds.has(c.email.toLowerCase()))
        .filter((c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.firstName.toLowerCase().includes(q),
        )
        .slice(0, 8)
    : clients.filter((c) => !selectedIds.has(c.email.toLowerCase())).slice(0, 6);

  const commit = () => {
    const raw = query.trim();
    if (!raw) return;
    if (EMAIL_RE.test(raw)) {
      onAdd(manualRecipient(raw));
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
      }}>
        <AtSign style={{ width: 10, height: 10, color: C.t3 }} strokeWidth={1.7} />
        <span style={{ fontSize: 10.5, color: C.t3, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Destinataires
        </span>
        {selected.length > 0 && (
          <span style={{
            fontSize: 10, color: C.t2,
            background: C.accentSoft, border: `1px solid ${C.accentBd}`,
            padding: "1px 6px", borderRadius: 4,
            fontVariantNumeric: "tabular-nums",
          }}>
            {selected.length}
          </span>
        )}
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center",
        minHeight: 32,
      }}>
        {selected.slice(0, 20).map((r) => (
          <span
            key={r.email}
            title={r.email}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 5px 3px 8px", borderRadius: 999,
              background: r.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${r.id ? "rgba(255,255,255,0.12)" : C.bd}`,
              color: C.t1, fontSize: 11.5, fontFamily: FONT,
              maxWidth: "100%",
            }}
          >
            {r.id
              ? <User style={{ width: 9, height: 9, color: C.t3 }} strokeWidth={2} />
              : <AtSign style={{ width: 9, height: 9, color: C.t3 }} strokeWidth={2} />}
            <span style={{
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: 160,
            }}>
              {r.fullName || r.email}
            </span>
            <button
              type="button"
              onClick={() => onRemove(r.email)}
              aria-label={`Retirer ${r.email}`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 16, height: 16, borderRadius: 999,
                background: "transparent", border: "none", cursor: "pointer",
                color: C.t3, transition: "color 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.t3; }}
            >
              <X style={{ width: 8, height: 8 }} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        {selected.length > 20 && (
          <span style={{
            fontSize: 10.5, color: C.t3, fontFamily: FONT,
            padding: "3px 8px", borderRadius: 999,
            background: C.l3,
          }}>
            +{selected.length - 20} autres
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setTimeout(() => setOpen(false), 140); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Backspace" && !query && selected.length > 0) {
              onRemove(selected[selected.length - 1].email);
            }
          }}
          placeholder={selected.length === 0 ? "Chercher un client ou taper un e-mail…" : "Ajouter…"}
          spellCheck={false}
          autoCapitalize="none"
          style={{
            flex: 1, minWidth: 140,
            border: "none", outline: "none", background: "transparent",
            color: C.t1, fontFamily: FONT, fontSize: 13,
            padding: "5px 0",
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (matches.length > 0 || loading || (q && EMAIL_RE.test(q))) && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            marginTop: 4, zIndex: 20,
            background: C.l1, border: `1px solid ${C.bd}`, borderRadius: 10,
            boxShadow: "0 12px 32px -8px rgba(0,0,0,0.55)",
            maxHeight: 280, overflowY: "auto",
            padding: 4,
          }}
        >
          {loading && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: C.t3 }}>
              Chargement de l'annuaire…
            </div>
          )}

          {matches.length === 0 && !loading && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: C.t3 }}>
              {q
                ? EMAIL_RE.test(q)
                  ? <span>Appuyer sur <strong>Entrée</strong> pour ajouter {q}</span>
                  : `Aucun résultat pour « ${q} ».`
                : "Tapez un nom ou un e-mail."}
            </div>
          )}

          {q && EMAIL_RE.test(q) && !selectedIds.has(q) && (
            <button
              type="button"
              onMouseDown={() => { onAdd(manualRecipient(query.trim())); setQuery(""); }}
              style={{
                display: "flex", width: "100%", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 7,
                background: "rgba(127,212,201,0.05)", border: "none", cursor: "pointer",
                color: C.t1, textAlign: "left", fontFamily: FONT,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(127,212,201,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(127,212,201,0.05)"; }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(127,212,201,0.1)", border: "1px solid rgba(127,212,201,0.2)",
                color: "#7FD4C9",
              }}>
                <UserPlus style={{ width: 12, height: 12 }} strokeWidth={2} />
              </span>
              <span style={{ fontSize: 13, color: C.t1 }}>
                Envoyer à <strong>{query.trim()}</strong>
              </span>
            </button>
          )}

          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onAdd(recipientFromClient(c)); setQuery(""); }}
              style={{
                display: "flex", width: "100%", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 7,
                background: "transparent", border: "none", cursor: "pointer",
                color: C.t1, textAlign: "left", fontFamily: FONT,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.05)", border: `1px solid ${C.bds}`,
                color: C.t2, fontSize: 11,
              }}>
                {(c.firstName || c.email)[0]?.toUpperCase() || "?"}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{
                  display: "block", fontSize: 12.5, color: C.t1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {c.fullName}
                </span>
                <span style={{
                  display: "block", fontSize: 10.5, color: C.t3,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {c.email}
                </span>
              </span>
              {c.kycStatus === "approved" && (
                <span style={{
                  fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "#7FD4C9", flexShrink: 0,
                  padding: "2px 5px", borderRadius: 4,
                  background: "rgba(127,212,201,0.08)",
                }}>
                  KYC
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── History ────────────────────────────────────────────────

function CampaignHistory({ campaigns }: { campaigns: CampaignRecord[] }) {
  const [selected, setSelected] = useState<CampaignRecord | null>(null);

  if (campaigns.length === 0) {
    return (
      <div style={{ ...card, padding: 48, textAlign: "center", fontFamily: FONT }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: C.l3,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px",
        }}>
          <Megaphone style={{ width: 22, height: 22, color: C.t3 }} strokeWidth={1.6} />
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
            <Metric icon={Target} label="Cible" value={selected.stats.total} />
            <Metric icon={Send} label="Envoyés" value={selected.stats.ok} />
            <Metric icon={AlertTriangle} label="Échecs" value={selected.stats.failed} />
            <Metric icon={TrendingUp} label="Réussite" value={`${successRate}%`} />
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
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: c.design === "promotion"
                ? "linear-gradient(135deg, #0F3A43, #12474F)"
                : c.design === "announcement" ? "#f4f1ea" : "#ffffff",
              border: `1px solid ${C.bds}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Megaphone style={{
                width: 14, height: 14,
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
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Users style={{ width: 9, height: 9 }} strokeWidth={1.5} />
                  {c.stats.ok}/{c.stats.total}
                </span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.t3, opacity: 0.5 }} />
                <span>{DESIGN_LABEL[c.design]}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{
                padding: "3px 8px", borderRadius: 6,
                background: successRate === 100 ? "rgba(127,212,201,0.08)" : "rgba(200,60,60,0.08)",
                fontSize: 11, fontWeight: 500,
                color: successRate === 100 ? "#7FD4C9" : "#e8a0a0",
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

// ─── Small components ───────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <div style={{
      padding: "10px 18px 6px",
      display: "flex", alignItems: "center", gap: 6,
      borderBottom: `1px solid rgba(255,255,255,0.03)`,
    }}>
      <Icon style={{ width: 10, height: 10, color: C.t3 }} strokeWidth={1.7} />
      <span style={{ ...sH, fontSize: 10 }}>{label}</span>
    </div>
  );
}

function SmallAction({
  icon: Icon, label, onClick, disabled,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        height: 24, padding: "0 8px", borderRadius: 6,
        background: "transparent", border: `1px solid ${C.bds}`,
        color: C.t3, fontSize: 10.5, fontFamily: FONT, cursor: disabled ? "default" : "pointer",
        transition: "all 0.12s",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = C.accentBd; e.currentTarget.style.color = C.t1; } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bds; e.currentTarget.style.color = C.t3; }}
    >
      <Icon style={{ width: 10, height: 10 }} strokeWidth={1.7} />
      {label}
    </button>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon style={{ width: 10, height: 10, color: C.t3, flexShrink: 0 }} strokeWidth={1.5} />
      <span style={{
        fontSize: 10.5, color: C.t3, fontFamily: FONT,
        minWidth: 36,
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

function Metric({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string | number }) {
  return (
    <div>
      <div style={{
        fontSize: 10, color: C.t3, letterSpacing: "0.12em",
        textTransform: "uppercase", fontFamily: FONT, marginBottom: 4,
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <Icon style={{ width: 9, height: 9 }} strokeWidth={1.5} />
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
