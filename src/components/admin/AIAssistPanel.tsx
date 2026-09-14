import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { contextChat, isAIError, type ChatMessage } from "@/lib/ai";
import { fetchPlatformContext } from "@/lib/aiContext";
import type { PlatformContext } from "@/lib/ai";
import { C, FONT, card, inputStyle } from "./adminTheme";

const nfCad = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });

const QUICK_PROMPTS = [
  "Résume l'état actuel de la plateforme",
  "Quelles commandes doivent être traitées en priorité ?",
  "Y a-t-il des anomalies ou des points d'attention ?",
  "Quel est le volume du jour ?",
];

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const AIAssistPanel = () => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<PlatformContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshCtx = useCallback(() => {
    setCtxLoading(true);
    fetchPlatformContext().then((c) => { setCtx(c); setCtxLoading(false); });
  }, []);

  useEffect(() => { refreshCtx(); }, [refreshCtx]);

  useEffect(() => {
    if (!ctx) return;
    const iv = setInterval(refreshCtx, 30_000);
    return () => clearInterval(iv);
  }, [ctx, refreshCtx]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading || !ctx) return;
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: "user", content: text.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history: ChatMessage[] = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    const freshCtx = await fetchPlatformContext();
    setCtx(freshCtx);

    const res = await contextChat({ messages: history, context: freshCtx });
    setLoading(false);

    if (isAIError(res)) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `**Erreur :** ${res.error}`,
        timestamp: Date.now(),
      }]);
      return;
    }

    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      role: "assistant",
      content: res.reply,
      timestamp: Date.now(),
    }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats bar */}
      <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 1, overflow: "hidden" }}>
        <StatCell label="En attente" value={ctx?.pendingOrders ?? "—"} loading={ctxLoading} />
        <StatCell label="En cours" value={ctx?.inProgressOrders ?? "—"} loading={ctxLoading} />
        <StatCell label="Complétées" value={ctx?.completedToday ?? "—"} sub="aujourd'hui" loading={ctxLoading} />
        <StatCell label="Volume" value={ctx ? `${nfCad.format(ctx.volumeCadToday)} $` : "—"} sub="CAD aujourd'hui" loading={ctxLoading} />
        <StatCell label="KYC" value={ctx?.pendingKyc ?? "—"} sub="en attente" loading={ctxLoading} />
        <StatCell label="Messages" value={ctx?.unreadMessages ?? "—"} sub="non lus" loading={ctxLoading} />
      </div>

      {/* Alerts */}
      {ctx && ctx.alerts.length > 0 && (
        <div style={{ ...card, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {ctx.alerts.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#f59e0b" }}>
              <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div style={{ ...card, display: "flex", flexDirection: "column", minHeight: 420 }}>
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}
        >
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "40px 20px" }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: C.l2, border: `1px solid ${C.bds}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot style={{ width: 24, height: 24, color: C.t2 }} strokeWidth={1.6} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: C.t1, margin: 0, fontWeight: 500 }}>Assistant IA Ooble</p>
                <p style={{ fontSize: 12, color: C.t3, margin: "6px 0 0", maxWidth: 340, lineHeight: 1.5 }}>
                  Posez une question sur l'état de la plateforme, les commandes, les clients ou la conformité. L'IA a accès au contexte en temps réel.
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
                {QUICK_PROMPTS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    disabled={loading || !ctx}
                    style={{
                      background: C.l2,
                      border: `1px solid ${C.bds}`,
                      borderRadius: 9,
                      padding: "8px 14px",
                      color: C.t2,
                      fontSize: 12,
                      fontFamily: FONT,
                      cursor: "pointer",
                      transition: "all 0.12s",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.bdh; e.currentTarget.style.color = C.t1; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bds; e.currentTarget.style.color = C.t2; }}
                  >
                    <Zap style={{ width: 12, height: 12 }} />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  ...(m.role === "user" ? { flexDirection: "row-reverse" } : {}),
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: m.role === "assistant" ? C.l3 : C.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {m.role === "assistant"
                    ? <Bot style={{ width: 14, height: 14, color: C.t2 }} strokeWidth={1.8} />
                    : <span style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>Vous</span>
                  }
                </div>
                <div style={{
                  maxWidth: "80%",
                  background: m.role === "user" ? C.accent : C.l2,
                  color: m.role === "user" ? "#111" : C.t1,
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  lineHeight: 1.55,
                  fontFamily: FONT,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: C.l3, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot style={{ width: 14, height: 14, color: C.t2 }} strokeWidth={1.8} />
              </div>
              <div style={{
                background: C.l2, borderRadius: 12, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 12, color: C.t3,
              }}>
                <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                Réflexion en cours…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          style={{
            borderTop: `1px solid ${C.bds}`,
            padding: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question à l'IA…"
            disabled={loading || !ctx}
            style={{ ...inputStyle, borderRadius: 10, padding: "10px 14px", fontSize: 13 }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.bdh; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.bd; }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !ctx}
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: input.trim() ? C.accent : C.l3,
              border: "none",
              color: input.trim() ? "#111" : C.t3,
              cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            <Send style={{ width: 16, height: 16 }} />
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const StatCell = ({ label, value, sub, loading }: { label: string; value: string | number; sub?: string; loading?: boolean }) => (
  <div style={{ padding: "14px 16px", background: C.l1 }}>
    <p style={{ fontSize: 10, color: C.t3, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT }}>{label}</p>
    <p style={{ fontSize: 20, fontWeight: 300, color: loading ? C.t3 : C.t1, margin: "4px 0 0", fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
      {loading ? "…" : value}
    </p>
    {sub && <p style={{ fontSize: 10, color: C.t3, margin: "2px 0 0", fontFamily: FONT }}>{sub}</p>}
  </div>
);

export default AIAssistPanel;
