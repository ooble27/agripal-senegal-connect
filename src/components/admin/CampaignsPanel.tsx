/**
 * Panneau « Campagnes » du back-office.
 *
 * Envoi d'e-mails marketing en masse avec :
 * - Génération IA du contenu (sujet, preheader, headline, body, CTA)
 * - Segmentation (tous, KYC approuvés, KYC en attente, entreprise)
 * - 3 designs professionnels (annonce, promotion, newsletter)
 * - Aperçu live desktop/mobile avec iframe
 * - Historique local avec métriques
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Megaphone, Send, Users, Sparkles, Eye, Bold, Italic, Link as LinkIcon,
  List, ListOrdered, Heading2, Quote, Minus, Check, AlertTriangle,
  Loader2, Smartphone, Monitor, ArrowLeft, Building2, ShieldCheck,
  Clock, Mail, Wand2, ChevronRight, BarChart3, X, Type,
  MousePointerClick, Hash, FileText, Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { sendCustomEmail } from "@/lib/email";
import {
  fetchClientDirectory, type ClientDirectoryEntry,
} from "@/lib/adminClient";
import {
  markdownToHtml, wrapSelection, insertAtCursor, prefixLines,
  substituteVars,
} from "@/lib/mailComposer";
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

const SEGMENTS: { id: CampaignSegment; icon: typeof Users; desc: string }[] = [
  { id: "all",          icon: Users,       desc: "Toute la base" },
  { id: "kyc_approved", icon: ShieldCheck, desc: "Identité vérifiée" },
  { id: "kyc_pending",  icon: Clock,       desc: "En attente" },
  { id: "business",     icon: Building2,   desc: "Entreprises" },
];

const DESIGNS: { id: CampaignDesign; desc: string; colors: [string, string] }[] = [
  { id: "announcement", desc: "Sobre, éditorial",    colors: ["#f4f1ea", "#2FA39B"] },
  { id: "promotion",    desc: "Hero coloré, impact", colors: ["#0F3A43", "#7FD4C9"] },
  { id: "update",       desc: "Newsletter dense",    colors: ["#ffffff", "#0F3A43"] },
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
            { label: "Segments",        value: 4 },
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
      {tab === "history" && (
        <CampaignHistory campaigns={campaigns} />
      )}
    </div>
  );
};

export default CampaignsPanel;

// ─── Composer de campagne ────────────────────────────────────

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
  const [aiFeedback, setAiFeedback] = useState<null | { kind: "ok" | "err"; text: string }>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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
    const bodyText = substituteVars(body || "", previewVars);
    const bodyHtml = markdownToHtml(bodyText);
    return renderCampaign(design, {
      preheader: preheader || subject || "",
      eyebrow: eyebrow || undefined,
      headline: substituteVars(headline, previewVars),
      bodyHtml,
      ctaLabel: ctaLabel || undefined,
      ctaUrl: ctaUrl || undefined,
    });
  }, [design, preheader, subject, eyebrow, headline, body, ctaLabel, ctaUrl, previewVars]);

  const canSend = name.trim().length > 0
    && subject.trim().length > 0
    && headline.trim().length > 0
    && body.trim().length > 0
    && recipients.length > 0
    && segment !== "manual";

  const generateWithAI = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;
    setAiLoading(true);
    setAiFeedback(null);

    const res = await draftCampaign({
      intention: prompt,
      segment: SEGMENT_LABEL[segment],
      design: DESIGN_LABEL[design],
    });

    setAiLoading(false);

    if (isAIError(res)) {
      setAiFeedback({ kind: "err", text: res.error });
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
    setAiFeedback({ kind: "ok", text: `Contenu généré (${r.tokens.in + r.tokens.out} tokens)` });
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
      name: name.trim(),
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
      setAiPrompt("");
      onSent();
    } else if (ok === 0) {
      setFeedback({ kind: "err", text: lastError ?? "Échec de tous les envois." });
    } else {
      setFeedback({ kind: "err", text: `${ok} envoyés, ${failed} en échec (${lastError ?? "cause inconnue"}).` });
    }
  };

  const withRef = (fn: (t: HTMLTextAreaElement) => void) => () => {
    if (textareaRef.current) fn(textareaRef.current);
  };
  const insertLink = withRef((t) => {
    const url = prompt("URL du lien (https://…)");
    if (!url) return;
    const label = t.value.slice(t.selectionStart, t.selectionEnd) || "texte du lien";
    insertAtCursor(t, `[${label}](${url})`);
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      {/* ─── Colonne de gauche : formulaire ────────────── */}
      <div style={{ fontFamily: FONT }}>
        {/* AI Generator */}
        <div style={{
          ...card,
          marginBottom: 12,
          padding: 0,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.15) 70%, rgba(255,255,255,0) 100%)",
          }} />
          <div style={{ padding: "16px 18px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Wand2 style={{ width: 14, height: 14, color: C.t1 }} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.t1, letterSpacing: "-0.01em" }}>
                  Assistant IA
                </div>
                <div style={{ fontSize: 10.5, color: C.t3, marginTop: 1 }}>
                  Décrivez votre campagne et l'IA génère tout le contenu
                </div>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <textarea
                ref={aiInputRef}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateWithAI(); } }}
                placeholder="Ex : Annonce du nouveau réseau Solana avec frais réduits de 50% cette semaine. Ton enthousiaste mais professionnel."
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.bd}`,
                  borderRadius: 10, padding: "12px 14px",
                  paddingRight: 50,
                  color: C.t1, fontFamily: FONT,
                  fontSize: 16, lineHeight: 1.55,
                  outline: "none", resize: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.bd; }}
              />
              <button
                type="button"
                onClick={generateWithAI}
                disabled={!aiPrompt.trim() || aiLoading}
                style={{
                  position: "absolute", right: 8, bottom: 8,
                  width: 34, height: 34, borderRadius: 9,
                  background: aiPrompt.trim() && !aiLoading ? C.accent : C.l3,
                  border: "none",
                  color: aiPrompt.trim() && !aiLoading ? "#111" : C.t3,
                  cursor: aiPrompt.trim() && !aiLoading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                {aiLoading
                  ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                  : <Sparkles style={{ width: 15, height: 15 }} strokeWidth={2} />}
              </button>
            </div>

            {aiFeedback && (
              <div style={{
                marginTop: 8, padding: "7px 10px", borderRadius: 7,
                background: aiFeedback.kind === "ok" ? "rgba(255,255,255,0.04)" : "rgba(200,60,60,0.10)",
                border: `1px solid ${aiFeedback.kind === "ok" ? "rgba(255,255,255,0.08)" : "rgba(200,60,60,0.25)"}`,
                fontSize: 11.5, color: aiFeedback.kind === "ok" ? C.t2 : "#f2c1c1",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {aiFeedback.kind === "ok"
                  ? <Check style={{ width: 11, height: 11 }} strokeWidth={2.5} />
                  : <AlertTriangle style={{ width: 11, height: 11 }} strokeWidth={2} />}
                {aiFeedback.text}
              </div>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div style={{ ...card, padding: 0 }}>
          {/* ── Section 1: Campagne + Segment ── */}
          <Section label="Campagne">
            <Field label="Nom interne">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Lancement Solana"
                style={{ ...inputStyle, fontSize: 16 }}
              />
            </Field>
            <div style={{ height: 14 }} />
            <Field label="Segment de destinataires">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {SEGMENTS.map(({ id: s, icon: Icon, desc }) => {
                  const active = segment === s;
                  const count = filterBySegment(clients, s).length;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSegment(s)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", borderRadius: 10, textAlign: "left",
                        background: active ? C.accentSoft : "transparent",
                        border: `1px solid ${active ? "rgba(255,255,255,0.18)" : C.bds}`,
                        color: C.t1,
                        fontFamily: FONT, cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: active ? "rgba(255,255,255,0.08)" : C.l3,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon style={{ width: 14, height: 14, color: active ? C.t1 : C.t2 }} strokeWidth={1.7} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: active ? 500 : 400, color: active ? C.t1 : C.t2 }}>
                          {SEGMENT_LABEL[s]}
                        </div>
                        <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>
                          {desc} · {clientsLoading ? "…" : count}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

          {/* ── Section 2: Design ── */}
          <Section label="Design">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {DESIGNS.map(({ id: d, desc, colors }) => {
                const active = design === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDesign(d)}
                    style={{
                      padding: 0, borderRadius: 10,
                      background: active ? C.accentSoft : "transparent",
                      border: `1px solid ${active ? "rgba(255,255,255,0.18)" : C.bds}`,
                      cursor: "pointer", textAlign: "left",
                      fontFamily: FONT, overflow: "hidden",
                      transition: "all 0.12s",
                    }}
                  >
                    {/* Color preview strip */}
                    <div style={{
                      height: 40, position: "relative",
                      background: d === "promotion"
                        ? `linear-gradient(135deg, ${colors[0]} 0%, #12474F 100%)`
                        : colors[0],
                      borderBottom: `2.5px solid ${colors[1]}`,
                    }}>
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column",
                        justifyContent: "center", padding: "0 10px",
                      }}>
                        <div style={{
                          width: "60%", height: 3, borderRadius: 2, marginBottom: 3,
                          background: d === "promotion" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.15)",
                        }} />
                        <div style={{
                          width: "40%", height: 2, borderRadius: 1,
                          background: d === "promotion" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)",
                        }} />
                      </div>
                    </div>
                    <div style={{ padding: "9px 10px" }}>
                      <div style={{ fontSize: 12, fontWeight: active ? 500 : 400, color: active ? C.t1 : C.t2 }}>
                        {DESIGN_LABEL[d]}
                      </div>
                      <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>
                        {desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Section 3: Objet + Preheader ── */}
          <Section label="Objet">
            <div style={{ display: "grid", gap: 10 }}>
              <Field label="Objet de l'e-mail">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ce que le client voit dans sa boîte"
                  style={{ ...inputStyle, fontSize: 16 }}
                />
              </Field>
              <Field label="Preheader (aperçu sous l'objet)">
                <input
                  type="text"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Complète l'objet dans la liste de mails"
                  style={{ ...inputStyle, fontSize: 16 }}
                />
              </Field>
            </div>
          </Section>

          {/* ── Section 4: Contenu ── */}
          <Section label="Contenu">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <Field label="Eyebrow">
                  <input
                    type="text"
                    value={eyebrow}
                    onChange={(e) => setEyebrow(e.target.value)}
                    placeholder="NOUVEAU"
                    style={{ ...inputStyle, fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}
                  />
                </Field>
                <Field label="Titre principal">
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Le message clé de la campagne"
                    style={{ ...inputStyle, fontSize: 16, fontWeight: 500 }}
                  />
                </Field>
              </div>

              <div>
                <div style={{ ...sH, marginBottom: 6 }}>Corps du message</div>
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 1,
                  padding: "4px 5px", marginBottom: 6,
                  background: C.l2,
                  border: `1px solid ${C.bds}`, borderRadius: 8,
                }}>
                  <ToolbarBtn title="Titre" onClick={withRef((t) => prefixLines(t, "## "))}>
                    <Heading2 style={{ width: 13, height: 13 }} strokeWidth={1.7} />
                  </ToolbarBtn>
                  <ToolbarBtn title="Gras" onClick={withRef((t) => wrapSelection(t, "**"))}>
                    <Bold style={{ width: 13, height: 13 }} strokeWidth={2} />
                  </ToolbarBtn>
                  <ToolbarBtn title="Italique" onClick={withRef((t) => wrapSelection(t, "*"))}>
                    <Italic style={{ width: 13, height: 13 }} strokeWidth={1.7} />
                  </ToolbarBtn>
                  <div style={{ width: 1, height: 20, background: C.bds, margin: "2px 3px" }} />
                  <ToolbarBtn title="Liste" onClick={withRef((t) => prefixLines(t, "- "))}>
                    <List style={{ width: 13, height: 13 }} strokeWidth={1.7} />
                  </ToolbarBtn>
                  <ToolbarBtn title="Liste numérotée" onClick={withRef((t) => prefixLines(t, "1. "))}>
                    <ListOrdered style={{ width: 13, height: 13 }} strokeWidth={1.7} />
                  </ToolbarBtn>
                  <ToolbarBtn title="Citation" onClick={withRef((t) => prefixLines(t, "> "))}>
                    <Quote style={{ width: 13, height: 13 }} strokeWidth={1.7} />
                  </ToolbarBtn>
                  <ToolbarBtn title="Lien" onClick={insertLink}>
                    <LinkIcon style={{ width: 13, height: 13 }} strokeWidth={1.7} />
                  </ToolbarBtn>
                  <ToolbarBtn title="Séparateur" onClick={withRef((t) => insertAtCursor(t, "\n\n---\n\n"))}>
                    <Minus style={{ width: 13, height: 13 }} strokeWidth={1.7} />
                  </ToolbarBtn>
                  <div style={{ width: 1, height: 20, background: C.bds, margin: "2px 3px" }} />
                  <ToolbarBtn title="{{prenom}}" onClick={withRef((t) => insertAtCursor(t, "{{prenom}}"))}>
                    <span style={{ fontSize: 9.5, fontFamily: FONT, padding: "0 2px", letterSpacing: "-0.02em" }}>
                      {"{{prenom}}"}
                    </span>
                  </ToolbarBtn>
                </div>
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={"Écrivez le contenu principal ici.\nUtilisez **gras** et *italique* pour la mise en forme.\n{{prenom}} sera remplacé par le prénom du client."}
                  rows={8}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${C.bd}`, borderRadius: 10,
                    padding: "12px 14px", color: C.t1,
                    fontFamily: FONT, fontSize: 16, lineHeight: 1.6,
                    outline: "none", resize: "vertical",
                  }}
                />
              </div>
            </div>
          </Section>

          {/* ── Section 5: CTA ── */}
          <Section label="Bouton d'action" last>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <Field label="Libellé">
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Acheter"
                  style={{ ...inputStyle, fontSize: 16 }}
                />
              </Field>
              <Field label="URL">
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://ooble.ca/app/acheter"
                  spellCheck={false}
                  autoCapitalize="none"
                  style={{ ...inputStyle, fontSize: 16 }}
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* Send Area */}
        <div style={{ ...card, padding: "14px 18px", marginTop: 12 }}>
          {feedback && (
            <div style={{
              marginBottom: 12, padding: "9px 12px", borderRadius: 8,
              background: feedback.kind === "ok" ? "rgba(255,255,255,0.04)" : "rgba(200,60,60,0.10)",
              border: `1px solid ${feedback.kind === "ok" ? "rgba(255,255,255,0.08)" : "rgba(200,60,60,0.25)"}`,
              color: feedback.kind === "ok" ? C.t1 : "#f2c1c1",
              fontSize: 12, display: "flex", alignItems: "center", gap: 7,
            }}>
              {feedback.kind === "ok"
                ? <Check style={{ width: 12, height: 12 }} strokeWidth={2.5} />
                : <AlertTriangle style={{ width: 12, height: 12 }} strokeWidth={2} />}
              {feedback.text}
            </div>
          )}
          {progress && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.t2, marginBottom: 4 }}>
                <span>Envoi en cours…</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{progress.done} / {progress.total}</span>
              </div>
              <div style={{ height: 3, background: C.l3, borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${(progress.done / progress.total) * 100}%`,
                  background: C.accent, transition: "width 0.2s",
                }} />
              </div>
            </div>
          )}

          {confirming ? (
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: C.l2, border: `1px solid ${C.bds}`,
            }}>
              <div style={{ fontSize: 12.5, color: C.t1, marginBottom: 12 }}>
                Envoyer <strong>{name || "cette campagne"}</strong> à <strong>{recipients.length}</strong> destinataire{recipients.length > 1 ? "s" : ""} ?
                <div style={{ fontSize: 10.5, color: C.t3, marginTop: 3 }}>
                  Un e-mail par destinataire, personnalisé avec son prénom. Design : {DESIGN_LABEL[design]}.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  style={{
                    height: 34, padding: "0 14px", borderRadius: 8,
                    border: `1px solid ${C.bd}`,
                    background: "transparent", color: C.t2,
                    fontSize: 12, fontFamily: FONT, cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={busy}
                  style={{
                    height: 34, padding: "0 16px", borderRadius: 8, border: "none",
                    background: C.accent, color: "#111",
                    fontSize: 12, fontWeight: 500, fontFamily: FONT,
                    cursor: busy ? "default" : "pointer",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  {busy
                    ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                    : <Send style={{ width: 13, height: 13 }} strokeWidth={2} />}
                  Confirmer l'envoi
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, color: C.t3 }}>
                {recipients.length > 0
                  ? `${recipients.length} destinataire${recipients.length > 1 ? "s" : ""} · ${DESIGN_LABEL[design]}`
                  : "Aucun destinataire"
                }
              </div>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!canSend}
                style={{
                  height: 38, padding: "0 20px", borderRadius: 9, border: "none",
                  background: canSend ? C.accent : C.l3,
                  color: canSend ? "#111" : C.t3,
                  fontSize: 13, fontWeight: 500, fontFamily: FONT,
                  display: "inline-flex", alignItems: "center", gap: 7,
                  cursor: canSend ? "pointer" : "default",
                  transition: "all 0.15s",
                }}
              >
                <Send style={{ width: 14, height: 14 }} strokeWidth={2} />
                Envoyer la campagne
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Colonne de droite : preview ──────────────── */}
      <div style={{ fontFamily: FONT, position: "sticky", top: 16, alignSelf: "start" }}>
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{
            padding: "10px 16px", borderBottom: `1px solid ${C.bds}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 400, color: C.t2,
            }}>
              <Eye style={{ width: 12, height: 12 }} strokeWidth={1.7} />
              Aperçu
            </span>
            <div style={{ display: "inline-flex", gap: 2, padding: 2, background: C.l3, borderRadius: 7 }}>
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
                    cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.12s",
                  }}
                >
                  <Icon style={{ width: 12, height: 12 }} strokeWidth={1.7} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: 14, background: "#e9e6df", minHeight: 500, maxHeight: 720, overflow: "auto" }}>
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
                    width: "100%", height: 640, border: "none", borderRadius: 10,
                    background: "#fff", boxShadow: "0 8px 32px -8px rgba(20,20,20,0.14)",
                  }}
                />
              </div>
            ) : (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                height: 400, textAlign: "center", padding: 20,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "rgba(0,0,0,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 12,
                }}>
                  <Mail style={{ width: 22, height: 22, color: "#8a97a0" }} strokeWidth={1.4} />
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", fontFamily: FONT, lineHeight: 1.5 }}>
                  Renseignez un titre pour
                  <br />voir l'aperçu du rendu.
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6, fontFamily: FONT }}>
                  Ou utilisez l'assistant IA pour remplir tous les champs automatiquement.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Info */}
        {previewHtml && (
          <div style={{ ...card, marginTop: 10, padding: "12px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <QuickStat icon={Users} label="Destinataires" value={recipients.length} />
              <QuickStat icon={Type} label="Design" value={DESIGN_LABEL[design]} />
              <QuickStat icon={Hash} label="Segment" value={SEGMENT_LABEL[segment].split(" ")[0]} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Historique des campagnes ────────────────────────────────

function CampaignHistory({ campaigns }: { campaigns: CampaignRecord[] }) {
  const [selected, setSelected] = useState<CampaignRecord | null>(null);

  if (campaigns.length === 0) {
    return (
      <div style={{ ...card, padding: 48, textAlign: "center", fontFamily: FONT }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: C.l3,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <Megaphone style={{ width: 20, height: 20, color: C.t3 }} strokeWidth={1.6} />
        </div>
        <p style={{ fontSize: 13, color: C.t2, margin: 0 }}>
          Aucune campagne envoyée
        </p>
        <p style={{ fontSize: 11.5, color: C.t3, margin: "4px 0 0" }}>
          Les campagnes envoyées apparaitront ici avec leurs statistiques.
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
        {/* Header */}
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
              <div style={{ color: C.t3, fontSize: 11, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{dateFmt.format(new Date(selected.sentAt))}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.t3, opacity: 0.5 }} />
                <span>{DESIGN_LABEL[selected.design]}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.t3, opacity: 0.5 }} />
                <span>{SEGMENT_LABEL[selected.segment]}</span>
              </div>
            </div>
          </div>

          {/* Metrics row */}
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

        {/* Preview */}
        <div style={{ ...card, padding: 14, background: "#e9e6df", borderRadius: 14 }}>
          <iframe
            title="Aperçu"
            srcDoc={bodyHtml}
            style={{
              width: "100%", height: 600, border: "none", borderRadius: 10,
              background: "#fff", boxShadow: "0 8px 32px -8px rgba(20,20,20,0.14)",
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
            {/* Design indicator */}
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: c.design === "promotion"
                ? "linear-gradient(135deg, #0F3A43, #12474F)"
                : c.design === "announcement"
                  ? "#f4f1ea"
                  : "#ffffff",
              border: `1px solid ${C.bds}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Megaphone style={{
                width: 14, height: 14,
                color: c.design === "promotion" ? "#7FD4C9" : "#0F3A43",
              }} strokeWidth={1.7} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name}
              </div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{SEGMENT_LABEL[c.segment]}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.t3, opacity: 0.5 }} />
                <span>{c.stats.ok}/{c.stats.total} envoyés</span>
              </div>
            </div>

            {/* Success rate */}
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
              <div style={{ fontSize: 10.5, color: C.t3, fontVariantNumeric: "tabular-nums", minWidth: 80, textAlign: "right" }}>
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

// ─── Composants utilitaires ─────────────────────────────────

function Section({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      padding: "16px 18px",
      borderBottom: last ? "none" : `1px solid ${C.bds}`,
    }}>
      <div style={{
        ...sH, marginBottom: 12,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11.5, color: C.t2, marginBottom: 5, fontFamily: FONT }}>
        {label}
      </div>
      {children}
    </label>
  );
}

function ToolbarBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: 28, height: 26, borderRadius: 5, padding: "0 5px",
        background: "transparent", border: "none", cursor: "pointer",
        color: C.t2, transition: "background 0.12s, color 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = C.t1; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.t2; }}
    >
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.t3, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: C.t1, fontSize: 20, fontWeight: 300, letterSpacing: "-0.01em", fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon style={{ width: 12, height: 12, color: C.t3, flexShrink: 0 }} strokeWidth={1.7} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: C.t3, fontFamily: FONT }}>{label}</div>
        <div style={{ fontSize: 12, color: C.t2, fontFamily: FONT, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </div>
      </div>
    </div>
  );
}
