import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Zap, Loader2, RefreshCw } from "lucide-react";
import { contextChat, isAIError, type ChatMessage } from "@/lib/ai";
import { fetchPlatformContext } from "@/lib/aiContext";
import type { PlatformContext } from "@/lib/ai";
import { C, FONT, card, inputStyle } from "./adminTheme";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Chat area */}
      <div style={{
        ...card,
        display: "flex",
        flexDirection: "column",
        minHeight: 480,
        overflow: "hidden",
      }}>
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: "auto",
            padding: "20px 20px 12px",
            display: "flex", flexDirection: "column", gap: 14,
          }}
        >
          {messages.length === 0 ? (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 20, padding: "48px 20px",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `linear-gradient(135deg, ${C.l2}, ${C.l3})`,
                border: `1px solid ${C.bds}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot style={{ width: 26, height: 26, color: C.t2 }} strokeWidth={1.5} />
              </div>
              <div style={{ textAlign: "center", maxWidth: 380 }}>
                <p style={{
                  fontSize: 16, color: C.t1, margin: 0,
                  fontWeight: 400, fontFamily: FONT,
                  letterSpacing: "-0.01em",
                }}>
                  Assistant IA
                </p>
                <p style={{
                  fontSize: 12.5, color: C.t3, margin: "8px 0 0",
                  lineHeight: 1.6, fontFamily: FONT,
                }}>
                  Posez une question sur les commandes, les clients, le KYC ou la conformité. L'assistant a accès au contexte en temps réel.
                </p>
              </div>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                justifyContent: "center", marginTop: 4,
              }}>
                {QUICK_PROMPTS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    disabled={loading || !ctx}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.bds}`,
                      borderRadius: 10,
                      padding: "9px 14px",
                      color: C.t2,
                      fontSize: 12,
                      fontFamily: FONT,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = C.bd;
                      e.currentTarget.style.color = C.t1;
                      e.currentTarget.style.background = C.l2;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.bds;
                      e.currentTarget.style.color = C.t2;
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Zap style={{ width: 11, height: 11, opacity: 0.5 }} />
                    {q}
                  </button>
                ))}
              </div>
              {ctxLoading && (
                <p style={{ fontSize: 11, color: C.t3, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw style={{ width: 11, height: 11, animation: "spin 1.5s linear infinite" }} />
                  Chargement du contexte…
                </p>
              )}
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
                {m.role === "assistant" && (
                  <div style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                    background: C.l2, border: `1px solid ${C.bds}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Bot style={{ width: 15, height: 15, color: C.t3 }} strokeWidth={1.7} />
                  </div>
                )}
                <div style={{
                  maxWidth: "82%",
                  background: m.role === "user" ? C.accent : C.l2,
                  color: m.role === "user" ? "#111" : C.t1,
                  borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  padding: "11px 15px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  fontFamily: FONT,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  border: m.role === "user" ? "none" : `1px solid ${C.bds}`,
                }}>
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: C.l2, border: `1px solid ${C.bds}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot style={{ width: 15, height: 15, color: C.t3 }} strokeWidth={1.7} />
              </div>
              <div style={{
                background: C.l2, border: `1px solid ${C.bds}`,
                borderRadius: "14px 14px 14px 4px",
                padding: "11px 15px",
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
            padding: "12px 16px",
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: C.l1,
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question…"
            disabled={loading || !ctx}
            style={{
              ...inputStyle,
              borderRadius: 10,
              padding: "11px 14px",
              fontSize: 13,
              background: C.bg,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.bdh; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.bd; }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !ctx}
            style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
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

export default AIAssistPanel;
