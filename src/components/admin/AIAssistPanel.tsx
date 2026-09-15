import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Zap, Loader2, RefreshCw, ArrowDown } from "lucide-react";
import { contextChat, isAIError, type ChatMessage } from "@/lib/ai";
import { fetchPlatformContext } from "@/lib/aiContext";
import type { PlatformContext } from "@/lib/ai";
import { C, FONT, card } from "./adminTheme";

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

/* ── Simple markdown → HTML (bold, lists, line breaks) ── */
function renderMarkdown(text: string): string {
  return text
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      // Check if it's a list block (all lines start with - or *)
      const lines = trimmed.split("\n");
      const isList = lines.every((l) => /^\s*[-*•]\s/.test(l) || l.trim() === "");
      if (isList) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => `<li>${inlineFormat(l.replace(/^\s*[-*•]\s+/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      // Check if it's a heading (### or ##)
      const headingMatch = /^(#{1,3})\s+(.+)/.exec(trimmed);
      if (headingMatch) {
        return `<strong>${inlineFormat(headingMatch[2])}</strong>`;
      }

      // Regular paragraph
      return `<p>${inlineFormat(trimmed.replace(/\n/g, "<br/>"))}</p>`;
    })
    .filter(Boolean)
    .join("");
}

function inlineFormat(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:4px;font-size:0.92em">$1</code>');
}

const AIAssistPanel = () => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<PlatformContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading || !ctx) return;
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: "user", content: text.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
        content: `Erreur : ${res.error}`,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 120px)", minHeight: 400,
      ...card,
      overflow: "hidden",
    }}>
      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          padding: "20px 0",
        }}
      >
        {messages.length === 0 ? (
          /* ── Empty state ── */
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 24, padding: "40px 24px",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: C.l2, border: `1px solid ${C.bds}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot style={{ width: 22, height: 22, color: C.t3 }} strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: "center", maxWidth: 340 }}>
              <p style={{ fontSize: 15, color: C.t1, margin: 0, fontFamily: FONT }}>
                Assistant IA
              </p>
              <p style={{ fontSize: 12, color: C.t3, margin: "6px 0 0", lineHeight: 1.6, fontFamily: FONT }}>
                Posez une question sur les commandes, les clients, le KYC ou la conformité.
              </p>
            </div>
            <div style={{
              display: "flex", flexDirection: "column", gap: 6,
              width: "100%", maxWidth: 380,
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
                    padding: "10px 14px",
                    color: C.t2, fontSize: 13, fontFamily: FONT,
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 8,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.bd;
                    e.currentTarget.style.background = C.l2;
                    e.currentTarget.style.color = C.t1;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.bds;
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = C.t2;
                  }}
                >
                  <Zap style={{ width: 12, height: 12, opacity: 0.4, flexShrink: 0 }} />
                  {q}
                </button>
              ))}
            </div>
            {ctxLoading && (
              <p style={{ fontSize: 11, color: C.t3, margin: 0, display: "flex", alignItems: "center", gap: 6, fontFamily: FONT }}>
                <RefreshCw style={{ width: 11, height: 11, animation: "spin 1.5s linear infinite" }} />
                Chargement du contexte…
              </p>
            )}
          </div>
        ) : (
          /* ── Messages ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ padding: "8px 20px" }}>
                {m.role === "user" ? (
                  /* User message — right aligned bubble */
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      maxWidth: "80%",
                      background: C.accent, color: "#111",
                      borderRadius: "18px 18px 4px 18px",
                      padding: "10px 16px",
                      fontSize: 13.5, lineHeight: 1.55, fontFamily: FONT,
                      wordBreak: "break-word",
                    }}>
                      {m.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant message — left aligned, no bubble */
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: C.l2, border: `1px solid ${C.bds}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 2,
                    }}>
                      <Bot style={{ width: 14, height: 14, color: C.t3 }} strokeWidth={1.7} />
                    </div>
                    <div
                      className="ai-response"
                      style={{
                        flex: 1, minWidth: 0,
                        fontSize: 13.5, lineHeight: 1.65, fontFamily: FONT,
                        color: C.t1, wordBreak: "break-word",
                      }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ padding: "8px 20px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: C.l2, border: `1px solid ${C.bds}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: 2,
                  }}>
                    <Bot style={{ width: 14, height: 14, color: C.t3 }} strokeWidth={1.7} />
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 0",
                    fontSize: 13, color: C.t3, fontFamily: FONT,
                  }}>
                    <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                    Réflexion…
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      {showScroll && (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={scrollToBottom}
            style={{
              position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
              width: 32, height: 32, borderRadius: "50%",
              background: C.l3, border: `1px solid ${C.bd}`,
              color: C.t2, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              zIndex: 5,
            }}
          >
            <ArrowDown style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        style={{
          borderTop: `1px solid ${C.bds}`,
          padding: "12px 16px",
          display: "flex", gap: 10, alignItems: "flex-end",
          background: C.l1,
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
          onKeyDown={handleKeyDown}
          placeholder="Posez une question…"
          disabled={loading || !ctx}
          rows={1}
          style={{
            flex: 1, resize: "none", overflow: "hidden",
            background: C.bg,
            border: `1px solid ${C.bd}`,
            borderRadius: 12,
            padding: "11px 14px",
            fontSize: 16, // 16px prevents iOS zoom
            fontFamily: FONT,
            color: C.t1, outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
            lineHeight: 1.5,
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
            marginBottom: 1,
          }}
        >
          <Send style={{ width: 16, height: 16 }} />
        </button>
      </form>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ai-response p { margin: 0 0 8px; }
        .ai-response p:last-child { margin: 0; }
        .ai-response ul { margin: 4px 0 8px; padding-left: 18px; }
        .ai-response ul:last-child { margin-bottom: 0; }
        .ai-response li { margin: 2px 0; color: ${C.t2}; }
        .ai-response strong { color: ${C.t1}; font-weight: 500; }
        .ai-response em { color: ${C.t2}; }
      `}</style>
    </div>
  );
};

export default AIAssistPanel;
