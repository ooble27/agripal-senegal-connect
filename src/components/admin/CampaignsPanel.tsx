/**
 * Panneau « Campagnes » du back-office.
 *
 * 1. Modèles : la galerie des courriels prêts à l'emploi (campaignTemplates.ts),
 *    chacun envoyable en test à sa propre adresse, ou tous d'un coup.
 * 2. Composer : on choisit un modèle, on modifie ses textes, on voit l'aperçu
 *    (ordinateur / téléphone), on s'envoie un test, puis on envoie.
 * 3. Historique.
 *
 * Chaque destinataire reçoit un lien de désabonnement personnel ; les
 * adresses désabonnées sont ignorées à l'envoi (Loi anti-pourriel).
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Megaphone, Send, Users, Sparkles, Check, AlertTriangle,
  Loader2, Smartphone, Monitor, ArrowLeft, Building2, ShieldCheck,
  Clock, Wand2, ChevronRight, X, User, UserPlus, Target,
  TrendingUp, Globe, AtSign, Plus, LayoutGrid, FlaskConical, Image as ImageIcon, UserX,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { sendCampaignEmail } from "@/lib/email";
import { supabase } from "@/integrations/supabase/client";
import { fetchClientDirectory, type ClientDirectoryEntry } from "@/lib/adminClient";
import { markdownToHtml } from "@/lib/mailComposer";
import {
  loadCampaigns, saveCampaign, SEGMENT_LABEL, DESIGN_LABEL,
  type CampaignRecord, type CampaignSegment, type CampaignDesign,
} from "@/lib/campaigns";
import { renderCampaign } from "@/lib/campaignDesigns";
import {
  CAMPAIGN_TEMPLATES, EMAIL_IMAGES, getTemplate, renderTemplate,
  type CampaignTemplate, type TemplateField, type TemplateValues,
} from "@/lib/campaignTemplates";
import { draftCampaign, isAIError, type DraftCampaignResult } from "@/lib/ai";
import AdminHero from "./AdminHero";
import { SubTabs } from "./AdminBits";
import { C, FONT, card, sH, inputStyle, btnPrimary, btnGhost } from "./adminTheme";

// ─── Types ──────────────────────────────────────────────────

type SubTab = "templates" | "compose" | "history";

interface Recipient {
  id?: string;
  email: string;
  firstName: string;
  fullName: string;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const SITE = "https://ooble.ca";

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

function filterBySegment(clients: ClientDirectoryEntry[], segment: CampaignSegment): ClientDirectoryEntry[] {
  switch (segment) {
    case "all":          return clients;
    case "kyc_approved": return clients.filter((c) => c.kycStatus === "approved");
    case "kyc_pending":  return clients.filter((c) => c.kycStatus === "pending");
    case "not_verified": return clients.filter((c) => c.kycStatus !== "approved");
    case "business":     return clients.filter((c) => c.accountType === "business");
    case "manual":       return [];
  }
}

const SEGMENTS: { id: CampaignSegment; icon: typeof Users; label: string }[] = [
  { id: "all",          icon: Globe,       label: "Tous" },
  { id: "kyc_approved", icon: ShieldCheck, label: "Vérifiés" },
  { id: "not_verified", icon: UserX,       label: "Non vérifiés" },
  { id: "kyc_pending",  icon: Clock,       label: "En attente" },
  { id: "business",     icon: Building2,   label: "Entreprises" },
];

// ─── Envoi ──────────────────────────────────────────────────

/** Jetons de désabonnement (créés au besoin) et adresses désabonnées. */
async function prepareRecipients(emails: string[]): Promise<Map<string, { token: string; unsubscribed: boolean }>> {
  const out = new Map<string, { token: string; unsubscribed: boolean }>();
  const { data, error } = await supabase.rpc("campaign_prepare" as never, { p_emails: emails } as never);
  if (error) throw new Error(error.message);
  for (const r of (data as unknown as { email: string; token: string; unsubscribed: boolean }[]) ?? []) {
    out.set(r.email.toLowerCase(), { token: r.token, unsubscribed: r.unsubscribed });
  }
  return out;
}

const unsubscribeUrl = (token?: string) => (token ? `${SITE}/desabonnement?t=${token}` : `${SITE}/desabonnement`);

async function sendTemplate(templateId: string, values: TemplateValues, r: Recipient, token: string | undefined, subjectPrefix = "") {
  const url = unsubscribeUrl(token);
  const out = renderTemplate(templateId, values, { prenom: r.firstName || "", email: r.email, unsubscribeUrl: url });
  return sendCampaignEmail({
    to: r.email,
    subject: `${subjectPrefix}${out.subject}`,
    html: out.html,
    text: out.text,
    unsubscribeUrl: url,
  });
}

/** Aperçu : prénom d'exemple, liens ouverts dans un nouvel onglet. */
function previewHtml(templateId: string, values: TemplateValues, prenom = "Awa"): string {
  const { html } = renderTemplate(templateId, values, { prenom, email: "client@exemple.ca", unsubscribeUrl: `${SITE}/desabonnement` });
  return html.replace("<head>", '<head><base target="_blank">');
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

// ─── Aperçu à l'échelle ─────────────────────────────────────

/**
 * Affiche un courriel dans une iframe de largeur réelle (680 px « ordinateur »,
 * 390 px « téléphone ») réduite pour tenir dans la colonne : les règles
 * mobiles du courriel ne se déclenchent qu'en vue téléphone, comme en vrai.
 */
function ScaledFrame({ html, frameWidth, maxHeight, interactive = true, title }: {
  html: string; frameWidth: number; maxHeight?: number; interactive?: boolean; title: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(maxHeight ?? 1400);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measure = () => {
    const doc = frameRef.current?.contentDocument;
    if (doc?.documentElement) setHeight(doc.documentElement.scrollHeight);
  };

  const scale = width > 0 ? Math.min(1, width / frameWidth) : 0;
  const shown = maxHeight ? Math.min(height, maxHeight) : height;

  return (
    <div ref={wrapRef} style={{ width: "100%", height: shown * scale, overflow: "hidden", position: "relative" }}>
      <iframe
        ref={frameRef}
        title={title}
        srcDoc={html}
        onLoad={measure}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        scrolling="no"
        tabIndex={interactive ? 0 : -1}
        style={{
          width: frameWidth, height, border: 0, display: "block",
          transform: `scale(${scale})`, transformOrigin: "top left",
          pointerEvents: interactive ? "auto" : "none",
          visibility: scale ? "visible" : "hidden",
        }}
      />
    </div>
  );
}

// ─── Panneau principal ──────────────────────────────────────

const CampaignsPanel = () => {
  const { user } = useAuth();
  const myEmail = user?.email ?? "";
  const [tab, setTab] = useState<SubTab>("templates");
  const [templateId, setTemplateId] = useState(CAMPAIGN_TEMPLATES[0].id);
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

  useEffect(() => {
    fetchClientDirectory(2000).then((c) => { setClients(c); setClientsLoading(false); });
    setCampaigns(loadCampaigns());
  }, []);

  const me: Recipient = useMemo(() => {
    const own = clients.find((c) => c.email.toLowerCase() === myEmail.toLowerCase());
    return own ? recipientFromClient(own) : manualRecipient(myEmail);
  }, [clients, myEmail]);

  const sent = useMemo(() => campaigns.reduce((n, c) => n + c.stats.ok, 0), [campaigns]);

  const TABS = [
    { id: "templates", label: "Modèles", count: CAMPAIGN_TEMPLATES.length },
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
            { label: "Courriels envoyés", value: sent },
            { label: "Modèles", value: CAMPAIGN_TEMPLATES.length },
            { label: "Contacts", value: clientsLoading ? "…" : clients.length },
          ]}
          actions={[
            { label: "Nouvelle campagne", icon: Megaphone, primary: true, onClick: () => setTab("compose") },
            { label: "Voir les modèles", icon: LayoutGrid, onClick: () => setTab("templates") },
          ]}
        />
      </div>

      <SubTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />

      {tab === "templates" && (
        <TemplateGallery
          me={me}
          onUse={(id) => { setTemplateId(id); setTab("compose"); }}
        />
      )}
      {tab === "compose" && (
        <CampaignComposer
          key={templateId}
          templateId={templateId}
          onChangeTemplate={() => setTab("templates")}
          me={me}
          clients={clients}
          clientsLoading={clientsLoading}
          onSent={() => { setCampaigns(loadCampaigns()); setTab("history"); }}
        />
      )}
      {tab === "history" && <CampaignHistory campaigns={campaigns} />}
    </div>
  );
};

export default CampaignsPanel;

// ─── Galerie ────────────────────────────────────────────────

type TestState = { kind: "busy" } | { kind: "ok"; text: string } | { kind: "err"; text: string };

function TemplateGallery({ me, onUse }: { me: Recipient; onUse: (id: string) => void }) {
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [all, setAll] = useState<{ done: number; failed: number; running: boolean; error?: string } | null>(null);

  const tokenFor = async (): Promise<string | undefined> => {
    const map = await prepareRecipients([me.email]);
    return map.get(me.email.toLowerCase())?.token;
  };

  const testOne = async (t: CampaignTemplate) => {
    if (!me.email) return;
    setTests((s) => ({ ...s, [t.id]: { kind: "busy" } }));
    try {
      const res = await sendTemplate(t.id, {}, me, await tokenFor(), "[Test] ");
      setTests((s) => ({ ...s, [t.id]: res.error ? { kind: "err", text: res.error } : { kind: "ok", text: "Test envoyé" } }));
    } catch (e) {
      setTests((s) => ({ ...s, [t.id]: { kind: "err", text: (e as Error).message } }));
    }
  };

  const testAll = async () => {
    if (!me.email || all?.running) return;
    setAll({ done: 0, failed: 0, running: true });
    let token: string | undefined;
    try { token = await tokenFor(); } catch (e) {
      setAll({ done: 0, failed: CAMPAIGN_TEMPLATES.length, running: false, error: (e as Error).message });
      return;
    }
    let done = 0;
    let failed = 0;
    let error: string | undefined;
    const n = CAMPAIGN_TEMPLATES.length;
    for (const [i, t] of CAMPAIGN_TEMPLATES.entries()) {
      const res = await sendTemplate(t.id, {}, me, token, `[Test ${i + 1}/${n}] `);
      if (res.error) { failed += 1; error = res.error; } else done += 1;
      setAll({ done, failed, running: true, error });
    }
    setAll({ done, failed, running: false, error });
  };

  return (
    <div className="space-y-4" style={{ fontFamily: FONT }}>
      <div style={{ ...card, padding: "16px 18px" }} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: C.t1, fontSize: 14 }}>{CAMPAIGN_TEMPLATES.length} modèles prêts à l'emploi</p>
          <p style={{ margin: "3px 0 0", color: C.t3, fontSize: 12, lineHeight: 1.5 }}>
            Les tests partent à <span style={{ color: C.t2 }}>{me.email || "votre adresse"}</span>, avec « [Test] » dans l'objet.
            {all && (
              <span style={{ display: "block", marginTop: 4, color: all.failed ? C.dangerText : C.successText }}>
                {all.running ? `Envoi en cours : ${all.done + all.failed} / ${CAMPAIGN_TEMPLATES.length}` : `${all.done} test${all.done > 1 ? "s" : ""} envoyé${all.done > 1 ? "s" : ""}`}
                {all.failed > 0 && ` · ${all.failed} en échec (${all.error ?? "erreur"})`}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={testAll}
          disabled={!me.email || all?.running}
          style={{ ...btnPrimary, opacity: !me.email || all?.running ? 0.6 : 1, alignSelf: "flex-start" }}
        >
          {all?.running
            ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
            : <Send style={{ width: 13, height: 13 }} strokeWidth={1.8} />}
          M'envoyer tous les modèles
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {CAMPAIGN_TEMPLATES.map((t, i) => (
          <TemplateCard
            key={t.id}
            index={i + 1}
            template={t}
            test={tests[t.id]}
            onUse={() => onUse(t.id)}
            onTest={() => testOne(t)}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ index, template: t, test, onUse, onTest }: {
  index: number; template: CampaignTemplate; test?: TestState; onUse: () => void; onTest: () => void;
}) {
  const html = useMemo(() => previewHtml(t.id, {}), [t.id]);
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column" }}>
      <button
        type="button"
        onClick={onUse}
        aria-label={`Utiliser le modèle ${t.name}`}
        style={{ display: "block", padding: "14px 14px 0", background: "#e9e6df", border: "none", cursor: "pointer", borderBottom: `1px solid ${C.bds}` }}
      >
        <ScaledFrame html={html} frameWidth={680} maxHeight={860} interactive={false} title={t.name} />
      </button>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: t.swatch[0], border: `3px solid ${t.swatch[1]}`, boxSizing: "border-box" }} />
          <span style={{ ...sH, fontSize: 10, letterSpacing: "0.12em" }}>{t.category}</span>
          {t.isNew && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: C.successBg, color: C.successText, border: `1px solid ${C.successBd}` }}>Nouveau</span>
          )}
        </div>
        <p style={{ margin: 0, color: C.t1, fontSize: 14.5, fontWeight: 500 }}>
          <span style={{ color: C.t3, fontVariantNumeric: "tabular-nums" }}>{index} · </span>{t.name}
        </p>
        <p style={{ margin: 0, color: C.t3, fontSize: 12, lineHeight: 1.55, flex: 1 }}>{t.description}</p>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button type="button" onClick={onUse} style={{ ...btnPrimary, height: 32, flex: 1, justifyContent: "center" }}>
            Utiliser
          </button>
          <button
            type="button"
            onClick={onTest}
            disabled={test?.kind === "busy"}
            title="M'envoyer ce modèle"
            style={{ ...btnGhost, height: 32, paddingLeft: 12, paddingRight: 12 }}
          >
            {test?.kind === "busy"
              ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
              : test?.kind === "ok"
                ? <Check style={{ width: 12, height: 12, color: C.successText }} strokeWidth={2.4} />
                : <FlaskConical style={{ width: 12, height: 12 }} strokeWidth={1.7} />}
            {test?.kind === "ok" ? "Envoyé" : "Test"}
          </button>
        </div>
        {test?.kind === "err" && (
          <p style={{ margin: 0, color: C.dangerText, fontSize: 11.5, lineHeight: 1.45 }}>{test.text}</p>
        )}
      </div>
    </div>
  );
}

// ─── Composer ───────────────────────────────────────────────

interface ComposerProps {
  templateId: string;
  onChangeTemplate: () => void;
  me: Recipient;
  clients: ClientDirectoryEntry[];
  clientsLoading: boolean;
  onSent: () => void;
}

function CampaignComposer({ templateId, onChangeTemplate, me, clients, clientsLoading, onSent }: ComposerProps) {
  const { user } = useAuth();
  const author = user?.email ?? "staff";
  const template = getTemplate(templateId);

  const [name, setName] = useState("");
  const [values, setValues] = useState<TemplateValues>({ ...template.defaults });
  const setField = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const addRecipient = useCallback((r: Recipient) => {
    setRecipients((prev) => prev.some((p) => p.email.toLowerCase() === r.email.toLowerCase()) ? prev : [...prev, r]);
  }, []);
  const removeRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((r) => r.email.toLowerCase() !== email.toLowerCase()));
  }, []);
  const addSegment = useCallback((seg: CampaignSegment) => {
    const filtered = filterBySegment(clients, seg);
    setRecipients((prev) => {
      const existing = new Set(prev.map((r) => r.email.toLowerCase()));
      return [...prev, ...filtered.filter((c) => !existing.has(c.email.toLowerCase())).map(recipientFromClient)];
    });
  }, [clients]);

  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [testTo, setTestTo] = useState(me.email);
  const [testState, setTestState] = useState<TestState | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [feedback, setFeedback] = useState<null | { kind: "ok" | "err"; text: string }>(null);
  const [confirming, setConfirming] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const debounced = useDebounced(values, 300);
  const sample = recipients[0]?.firstName || me.firstName || "Awa";
  const html = useMemo(() => previewHtml(templateId, debounced, sample), [templateId, debounced, sample]);

  const fieldKeys = new Set(template.fields.map((f) => f.key));
  const canSend = (values.subject ?? "").trim().length > 0 && recipients.length > 0;

  const generateWithAI = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;
    setAiLoading(true);
    setFeedback(null);
    const res = await draftCampaign({
      intention: prompt,
      segment: recipients.length > 0 ? `${recipients.length} destinataires sélectionnés` : "audience générale",
      design: template.name,
    });
    setAiLoading(false);
    if (isAIError(res)) { setFeedback({ kind: "err", text: res.error }); return; }
    const r = res as DraftCampaignResult;
    const next: TemplateValues = {};
    const put = (k: string, v: string) => { if (fieldKeys.has(k) && v) next[k] = v; };
    put("subject", r.subject);
    put("preheader", r.preheader);
    put("headline", r.headline);
    put("intro", r.body);
    put("message", r.body);
    put("cta", r.ctaLabel);
    put("ctaUrl", r.ctaUrl);
    put("eyebrow", r.eyebrow);
    put("label", r.eyebrow);
    put("badge", r.eyebrow);
    setValues((s) => ({ ...s, ...next }));
    if (!name.trim()) setName(prompt.slice(0, 60));
    setFeedback({ kind: "ok", text: `Textes proposés par l'IA : ${Object.keys(next).length} champs remplis. Relisez avant d'envoyer.` });
  };

  const sendTest = async () => {
    const to = testTo.trim();
    if (!EMAIL_RE.test(to)) { setTestState({ kind: "err", text: "Adresse invalide." }); return; }
    setTestState({ kind: "busy" });
    try {
      const map = await prepareRecipients([to]);
      const r = to.toLowerCase() === me.email.toLowerCase() ? me : (clients.find((c) => c.email.toLowerCase() === to.toLowerCase()) ? recipientFromClient(clients.find((c) => c.email.toLowerCase() === to.toLowerCase())!) : manualRecipient(to));
      const res = await sendTemplate(templateId, values, r, map.get(to.toLowerCase())?.token, "[Test] ");
      setTestState(res.error ? { kind: "err", text: res.error } : { kind: "ok", text: `Test envoyé à ${to}` });
    } catch (e) {
      setTestState({ kind: "err", text: (e as Error).message });
    }
  };

  const send = async () => {
    if (!canSend || busy) return;
    setBusy(true);
    setFeedback(null);

    let map: Map<string, { token: string; unsubscribed: boolean }>;
    try {
      map = await prepareRecipients(recipients.map((r) => r.email));
    } catch (e) {
      setBusy(false);
      setConfirming(false);
      setFeedback({ kind: "err", text: `Préparation impossible : ${(e as Error).message}` });
      return;
    }

    const targets = recipients.filter((r) => !map.get(r.email.toLowerCase())?.unsubscribed);
    const skipped = recipients.length - targets.length;
    setProgress({ done: 0, total: targets.length });

    let ok = 0;
    let failed = 0;
    let lastError: string | undefined;
    for (let i = 0; i < targets.length; i++) {
      const r = targets[i];
      const res = await sendTemplate(templateId, values, r, map.get(r.email.toLowerCase())?.token);
      if (res.error) { failed += 1; lastError = res.error; } else ok += 1;
      setProgress({ done: i + 1, total: targets.length });
    }

    saveCampaign({
      id: crypto.randomUUID(),
      name: name.trim() || values.subject || template.name,
      segment: "manual",
      design: template.id,
      templateId: template.id,
      values,
      subject: values.subject ?? "",
      preheader: values.preheader ?? "",
      body: "",
      sentAt: new Date().toISOString(),
      sentBy: author,
      stats: { total: recipients.length, ok, failed, skipped },
    });

    setBusy(false);
    setProgress(null);
    setConfirming(false);
    const skippedText = skipped > 0 ? ` ${skipped} désabonné${skipped > 1 ? "s" : ""} ignoré${skipped > 1 ? "s" : ""}.` : "";
    if (failed === 0) {
      setFeedback({ kind: "ok", text: `Campagne envoyée à ${ok} destinataire${ok > 1 ? "s" : ""}.${skippedText}` });
      onSent();
    } else if (ok === 0) {
      setFeedback({ kind: "err", text: (lastError ?? "Échec de tous les envois.") + skippedText });
    } else {
      setFeedback({ kind: "err", text: `${ok} envoyés, ${failed} en échec (${lastError ?? "cause inconnue"}).${skippedText}` });
    }
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)]">
      {/* ─── Colonne gauche : modèle, textes, audience ─── */}
      <div className="space-y-4" style={{ fontFamily: FONT, minWidth: 0 }}>
        <div style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: template.swatch[0], border: `4px solid ${template.swatch[1]}`, boxSizing: "border-box" }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, color: C.t1, fontSize: 14 }}>{template.name}</p>
            <p style={{ margin: "2px 0 0", color: C.t3, fontSize: 11.5, lineHeight: 1.45 }}>{template.description}</p>
          </div>
          <button type="button" onClick={onChangeTemplate} style={{ ...btnGhost, height: 32 }}>
            <LayoutGrid style={{ width: 12, height: 12 }} strokeWidth={1.7} />
            Changer
          </button>
        </div>

        {/* Textes */}
        <div style={{ ...card, padding: 0 }}>
          <SectionHeader icon={Wand2} label="Contenu" />
          <div style={{ padding: "14px 18px", display: "grid", gap: 14 }}>
            <EditField label="Nom interne de la campagne" value={name} onChange={setName} placeholder={values.subject || template.name} />
            {template.fields.map((f) => (
              <TemplateFieldInput key={f.key} field={f} value={values[f.key] ?? ""} onChange={(v) => setField(f.key, v)} />
            ))}
            <p style={{ margin: 0, color: C.t3, fontSize: 11.5, lineHeight: 1.55 }}>
              <strong style={{ color: C.t2, fontWeight: 500 }}>{"{{prenom}}"}</strong> insère le prénom du destinataire ·{" "}
              <strong style={{ color: C.t2, fontWeight: 500 }}>**mot**</strong> met en gras.{" "}
              <button type="button" onClick={() => setValues({ ...template.defaults })} style={{ background: "none", border: "none", padding: 0, color: C.t2, textDecoration: "underline", cursor: "pointer", fontSize: 11.5, fontFamily: FONT }}>
                Remettre les textes d'origine
              </button>
            </p>
          </div>

          <div style={{ borderTop: `1px solid ${C.bds}`, padding: "12px 18px" }}>
            {!aiOpen ? (
              <button type="button" onClick={() => setAiOpen(true)} style={{ ...btnGhost, height: 30 }}>
                <Sparkles style={{ width: 12, height: 12 }} strokeWidth={1.7} />
                Rédiger les textes avec l'IA
              </button>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  placeholder="Décrivez le message (ex. : rappeler aux clients non vérifiés de terminer leur vérification avant la fin du mois)."
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={generateWithAI} disabled={!aiPrompt.trim() || aiLoading} style={{ ...btnPrimary, height: 32, opacity: !aiPrompt.trim() || aiLoading ? 0.6 : 1 }}>
                    {aiLoading ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 12, height: 12 }} strokeWidth={1.8} />}
                    {aiLoading ? "Rédaction…" : "Proposer les textes"}
                  </button>
                  <button type="button" onClick={() => setAiOpen(false)} style={{ ...btnGhost, height: 32 }}>Fermer</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test */}
        <div style={{ ...card, padding: 0 }}>
          <SectionHeader icon={FlaskConical} label="Envoyer un test" />
          <div style={{ padding: "14px 18px", display: "grid", gap: 8 }}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="votre@adresse.ca"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={sendTest} disabled={testState?.kind === "busy"} style={{ ...btnGhost, justifyContent: "center" }}>
                {testState?.kind === "busy" ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 12, height: 12 }} strokeWidth={1.7} />}
                Envoyer le test
              </button>
            </div>
            {testState && testState.kind !== "busy" && (
              <p style={{ margin: 0, fontSize: 12, color: testState.kind === "ok" ? C.successText : C.dangerText }}>{testState.text}</p>
            )}
          </div>
        </div>

        {/* Audience + envoi */}
        <div style={{ ...card, padding: 0 }}>
          <SectionHeader icon={Target} label="Audience" />
          <div style={{ padding: "10px 18px" }}>
            <CampaignRecipientPicker
              selected={recipients}
              clients={clients}
              loading={clientsLoading}
              onAdd={addRecipient}
              onRemove={removeRecipient}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.bds}` }}>
              <span style={{ fontSize: 10.5, color: C.t3, marginRight: 4, lineHeight: "26px" }}>Ajouter un groupe :</span>
              {SEGMENTS.map(({ id: s, icon: Icon, label }) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSegment(s)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4, height: 26, padding: "0 9px", borderRadius: 7,
                    background: "transparent", border: `1px solid ${C.bds}`, color: C.t2, fontSize: 11, fontFamily: FONT, cursor: "pointer",
                  }}
                >
                  <Plus style={{ width: 9, height: 9 }} strokeWidth={2} />
                  <Icon style={{ width: 10, height: 10 }} strokeWidth={1.7} />
                  {label}
                  <span style={{ fontSize: 10, color: C.t3, background: C.l3, padding: "1px 4px", borderRadius: 3, fontVariantNumeric: "tabular-nums" }}>
                    {clientsLoading ? "…" : filterBySegment(clients, s).length}
                  </span>
                </button>
              ))}
              {recipients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecipients([])}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4, height: 26, padding: "0 9px", borderRadius: 7,
                    background: "transparent", border: `1px solid ${C.dangerBd}`, color: C.dangerText, fontSize: 11, fontFamily: FONT, cursor: "pointer",
                  }}
                >
                  <X style={{ width: 9, height: 9 }} strokeWidth={2} />
                  Vider
                </button>
              )}
            </div>
          </div>

          {feedback && (
            <div style={{
              margin: "4px 18px 10px", padding: "8px 12px", borderRadius: 8,
              background: feedback.kind === "ok" ? C.successBg : C.dangerBg,
              border: `1px solid ${feedback.kind === "ok" ? C.successBd : C.dangerBd}`,
              color: feedback.kind === "ok" ? C.successText : C.dangerText,
              fontSize: 12, display: "flex", alignItems: "center", gap: 6,
            }}>
              {feedback.kind === "ok" ? <Check style={{ width: 12, height: 12, flexShrink: 0 }} strokeWidth={2.5} /> : <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} strokeWidth={2} />}
              {feedback.text}
            </div>
          )}

          {progress && (
            <div style={{ margin: "0 18px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.t2, marginBottom: 4 }}>
                <span>Envoi en cours…</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{progress.done} / {progress.total}</span>
              </div>
              <div style={{ height: 3, background: C.l3, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: C.accent, transition: "width 0.2s" }} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ padding: "14px 18px", borderTop: `1px solid ${C.bds}` }}>
            <span style={{ fontSize: 12, color: C.t3, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Users style={{ width: 12, height: 12 }} strokeWidth={1.6} />
              {recipients.length > 0 ? `${recipients.length} destinataire${recipients.length > 1 ? "s" : ""}` : "Aucun destinataire"}
            </span>
            {confirming ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => setConfirming(false)} disabled={busy} style={{ ...btnGhost, height: 34 }}>Annuler</button>
                <button type="button" onClick={send} disabled={busy} style={{ ...btnPrimary, height: 34 }}>
                  {busy ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 12, height: 12 }} strokeWidth={2} />}
                  Confirmer l'envoi ({recipients.length})
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!canSend}
                style={{ ...btnPrimary, opacity: canSend ? 1 : 0.5, cursor: canSend ? "pointer" : "default" }}
              >
                <Send style={{ width: 13, height: 13 }} strokeWidth={2} />
                Envoyer la campagne
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Colonne droite : aperçu ─── */}
      <div className="xl:sticky xl:top-4" style={{ fontFamily: FONT, minWidth: 0 }}>
        <div style={{ ...card, padding: 0 }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.bds}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(values.subject ?? "").replace(/\{\{\s*prenom\s*\}\}/gi, sample) || "Sans objet"}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(values.preheader ?? "").replace(/\{\{\s*prenom\s*\}\}/gi, sample)}
              </p>
            </div>
            <div style={{ display: "inline-flex", gap: 2, padding: 2, background: C.l3, borderRadius: 7, flexShrink: 0 }}>
              {([
                { mode: "desktop" as const, icon: Monitor, label: "Ordinateur" },
                { mode: "mobile" as const, icon: Smartphone, label: "Téléphone" },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  aria-label={label}
                  aria-pressed={previewMode === mode}
                  style={{
                    height: 26, width: 30, borderRadius: 5, border: "none",
                    background: previewMode === mode ? C.l1 : "transparent",
                    color: previewMode === mode ? C.t1 : C.t3, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Icon style={{ width: 13, height: 13 }} strokeWidth={1.7} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: "#e9e6df", padding: previewMode === "mobile" ? "16px 0" : 0, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <div style={{ maxWidth: previewMode === "mobile" ? 390 : "none", margin: "0 auto" }}>
              <ScaledFrame
                key={previewMode}
                html={html}
                frameWidth={previewMode === "mobile" ? 390 : 680}
                title="Aperçu du courriel"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateFieldInput({ field, value, onChange }: { field: TemplateField; value: string; onChange: (v: string) => void }) {
  if (field.kind === "image") {
    const current = EMAIL_IMAGES.find((i) => i.id === value);
    return (
      <label style={{ display: "block" }}>
        <FieldLabel icon>{field.label}</FieldLabel>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {current && (
            <img src={current.url} alt="" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.bds}`, background: "#f6f1e7", flexShrink: 0 }} />
          )}
          <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
            {EMAIL_IMAGES.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
        </div>
      </label>
    );
  }
  const multiline = field.kind === "textarea" || field.kind === "lines";
  const rows = field.kind === "lines" ? Math.max(3, value.split("\n").length + 1) : 3;
  return (
    <EditField
      label={field.label}
      value={value}
      onChange={onChange}
      multiline={multiline}
      rows={rows}
      hint={field.hint}
      placeholder={field.kind === "url" ? "/app/acheter ou https://…" : undefined}
    />
  );
}

function FieldLabel({ children, icon }: { children: React.ReactNode; icon?: boolean }) {
  return (
    <div style={{ fontSize: 11, color: C.t3, marginBottom: 5, fontFamily: FONT, display: "flex", alignItems: "center", gap: 5 }}>
      {icon && <ImageIcon style={{ width: 11, height: 11 }} strokeWidth={1.6} />}
      {children}
    </div>
  );
}

function EditField({ label, value, onChange, multiline, rows = 3, hint, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; rows?: number; hint?: string; placeholder?: string;
}) {
  const shared: React.CSSProperties = { ...inputStyle, fontSize: 13 };
  return (
    <label style={{ display: "block" }}>
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ ...shared, resize: "vertical", lineHeight: 1.55 }} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={shared} />
      )}
      {hint && <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4, lineHeight: 1.45 }}>{hint}</div>}
    </label>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <div style={{ padding: "11px 18px 9px", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${C.bds}` }}>
      <Icon style={{ width: 11, height: 11, color: C.t3 }} strokeWidth={1.7} />
      <span style={{ ...sH, fontSize: 10 }}>{label}</span>
    </div>
  );
}

// ─── Historique ─────────────────────────────────────────────

function recordLabel(c: CampaignRecord): string {
  if (c.templateId) return getTemplate(c.templateId).name;
  return DESIGN_LABEL[c.design as CampaignDesign] ?? String(c.design);
}

function recordHtml(c: CampaignRecord): string {
  if (c.templateId) return previewHtml(c.templateId, c.values ?? {}, "Client");
  return renderCampaign(c.design as CampaignDesign, {
    preheader: c.preheader || c.subject,
    headline: c.subject,
    bodyHtml: markdownToHtml(c.body),
  });
}

function CampaignHistory({ campaigns }: { campaigns: CampaignRecord[] }) {
  const [selected, setSelected] = useState<CampaignRecord | null>(null);

  if (campaigns.length === 0) {
    return (
      <div style={{ ...card, padding: 48, textAlign: "center", fontFamily: FONT }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: C.l3, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <Megaphone style={{ width: 22, height: 22, color: C.t3 }} strokeWidth={1.6} />
        </div>
        <p style={{ fontSize: 13, color: C.t2, margin: 0 }}>Aucune campagne envoyée</p>
        <p style={{ fontSize: 11.5, color: C.t3, margin: "4px 0 0" }}>Les campagnes apparaîtront ici avec leurs statistiques.</p>
      </div>
    );
  }

  if (selected) {
    const reached = selected.stats.total - (selected.stats.skipped ?? 0);
    const rate = reached > 0 ? Math.round((selected.stats.ok / reached) * 100) : 0;
    return (
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)]" style={{ fontFamily: FONT }}>
        <div style={{ ...card }}>
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Retour à l'historique"
              style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: "transparent", border: `1px solid ${C.bds}`, color: C.t2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} strokeWidth={1.8} />
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: C.t1, fontSize: 14, fontWeight: 500 }}>{selected.name}</div>
              <div style={{ color: C.t3, fontSize: 11, marginTop: 2 }}>
                {dateFmt.format(new Date(selected.sentAt))} · {recordLabel(selected)} · {SEGMENT_LABEL[selected.segment]} · {selected.sentBy}
              </div>
            </div>
          </div>
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.bds}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <Metric icon={Target} label="Cible" value={selected.stats.total} />
            <Metric icon={Send} label="Envoyés" value={selected.stats.ok} />
            <Metric icon={UserX} label="Désabonnés" value={selected.stats.skipped ?? 0} />
            <Metric icon={TrendingUp} label="Réussite" value={`${rate}%`} />
          </div>
        </div>
        <div style={{ ...card, background: "#e9e6df" }}>
          <ScaledFrame html={recordHtml(selected)} frameWidth={680} title="Courriel envoyé" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...card, fontFamily: FONT }}>
      {campaigns.map((c, i) => {
        const reached = c.stats.total - (c.stats.skipped ?? 0);
        const rate = reached > 0 ? Math.round((c.stats.ok / reached) * 100) : 0;
        const t = c.templateId ? getTemplate(c.templateId) : null;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c)}
            style={{
              display: "flex", width: "100%", alignItems: "center", gap: 12, padding: "14px 18px", textAlign: "left",
              borderBottom: i < campaigns.length - 1 ? `1px solid ${C.bds}` : "none",
              background: "transparent", border: "none", cursor: "pointer", fontFamily: FONT,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.hover1; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0, boxSizing: "border-box",
              background: t ? t.swatch[0] : C.l3, border: t ? `4px solid ${t.swatch[1]}` : `1px solid ${C.bds}`,
            }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                {c.stats.ok}/{c.stats.total} · {recordLabel(c)} · {dateFmt.format(new Date(c.sentAt))}
              </div>
            </div>
            <span style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, fontVariantNumeric: "tabular-nums", flexShrink: 0,
              background: c.stats.failed === 0 ? C.successBg : C.dangerBg,
              color: c.stats.failed === 0 ? C.successText : C.dangerText,
            }}>
              {rate}%
            </span>
            <ChevronRight style={{ width: 14, height: 14, color: C.t3, flexShrink: 0 }} strokeWidth={1.5} />
          </button>
        );
      })}
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
              background: r.id ? C.hover4 : C.hover2,
              border: `1px solid ${r.id ? C.chipBd : C.bd}`,
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
            boxShadow: C.shadowHeavy,
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
                background: C.successBg, border: "none", cursor: "pointer",
                color: C.t1, textAlign: "left", fontFamily: FONT,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.hover4; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.successBg; }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: C.successBg, border: `1px solid ${C.successBd}`,
                color: C.successText,
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
              onMouseEnter={(e) => { e.currentTarget.style.background = C.hover3; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: C.hover3, border: `1px solid ${C.bds}`,
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
                  color: C.successText, flexShrink: 0,
                  padding: "2px 5px", borderRadius: 4,
                  background: C.successBg,
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
