import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown, Sparkles, TrendingUp, AlertTriangle, BarChart3, ArrowUp } from "lucide-react";
import { contextChat, isAIError, type ChatMessage } from "@/lib/ai";
import { fetchPlatformContext } from "@/lib/aiContext";
import type { PlatformContext } from "@/lib/ai";
import { C, FONT } from "./adminTheme";

const SUGGESTIONS = [
  { text: "État de la plateforme", icon: Sparkles },
  { text: "Commandes prioritaires", icon: TrendingUp },
  { text: "Anomalies détectées", icon: AlertTriangle },
  { text: "Volume du jour", icon: BarChart3 },
];

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

function renderMarkdown(text: string): string {
  return text
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      const lines = trimmed.split("\n");
      const isList = lines.every((l) => /^\s*[-*•]\s/.test(l) || l.trim() === "");
      if (isList) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => `<li>${inlineFormat(l.replace(/^\s*[-*•]\s+/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      const headingMatch = /^(#{1,3})\s+(.+)/.exec(trimmed);
      if (headingMatch) return `<strong>${inlineFormat(headingMatch[2])}</strong>`;
      return `<p>${inlineFormat(trimmed.replace(/\n/g, "<br/>"))}</p>`;
    })
    .filter(Boolean)
    .join("");
}

function inlineFormat(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

const AIAssistPanel = ({ fullPage = false }: { fullPage?: boolean }) => {
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
        id: crypto.randomUUID(), role: "assistant",
        content: `Erreur : ${res.error}`, timestamp: Date.now(),
      }]);
      return;
    }

    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(), role: "assistant",
      content: res.reply, timestamp: Date.now(),
    }]);
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const hasMessages = messages.length > 0;

  const inputBar = (
    <div style={{
      width: "100%", maxWidth: 680,
      margin: "0 auto",
    }}>
      <form
        onSubmit={handleSubmit}
        className="ai-input-form"
        style={{
          width: "100%",
          background: C.l1,
          borderRadius: 24,
          border: `1px solid ${C.bds}`,
          display: "flex", alignItems: "flex-end",
          padding: "6px 6px 6px 18px",
          transition: "border-color 0.15s",
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
            background: "transparent",
            border: "none",
            padding: "8px 0",
            fontSize: 16,
            fontFamily: FONT,
            color: C.t1, outline: "none",
            boxSizing: "border-box",
            lineHeight: 1.5,
            maxHeight: 160,
          }}
          onFocus={(e) => {
            const form = e.currentTarget.closest(".ai-input-form") as HTMLElement | null;
            if (form) form.style.borderColor = C.bd;
          }}
          onBlur={(e) => {
            const form = e.currentTarget.closest(".ai-input-form") as HTMLElement | null;
            if (form) form.style.borderColor = C.bds;
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || !ctx}
          style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: input.trim() ? C.accent : C.l3,
            border: "none",
            color: input.trim() ? "#111" : C.t3,
            cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
        >
          <ArrowUp style={{ width: 18, height: 18 }} strokeWidth={2.2} />
        </button>
      </form>
    </div>
  );

  if (!hasMessages) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        flex: fullPage ? 1 : undefined,
        height: fullPage ? undefined : "calc(100vh - 200px)",
        minHeight: 400,
      }}>
        {/* Suggestions — centered in the available space */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 20px",
          gap: 32,
        }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{
              fontSize: 26, fontWeight: 300, color: C.t1,
              margin: 0, fontFamily: FONT, letterSpacing: "-0.02em",
            }}>
              Comment puis-je aider ?
            </h2>
            {ctxLoading && (
              <p style={{
                fontSize: 12, color: C.t3, margin: "12px 0 0",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontFamily: FONT,
              }}>
                <Loader2 style={{ width: 12, height: 12, animation: "spin 1.5s linear infinite" }} />
                Connexion aux données…
              </p>
            )}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            width: "100%", maxWidth: 420,
          }}>
            {SUGGESTIONS.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => send(s.text)}
                  disabled={loading || !ctx}
                  style={{
                    background: C.l1,
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 16px",
                    color: C.t2, fontSize: 13, fontFamily: FONT,
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 10,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.l2;
                    e.currentTarget.style.color = C.t1;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.l1;
                    e.currentTarget.style.color = C.t2;
                  }}
                >
                  <Icon style={{ width: 15, height: 15, opacity: 0.5, flexShrink: 0 }} strokeWidth={1.6} />
                  {s.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input bar — at the bottom */}
        <div style={{
          padding: `14px 0`,
          paddingBottom: `max(24px, env(safe-area-inset-bottom, 12px))`,
          flexShrink: 0,
        }}>
          {inputBar}
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .ai-input-form textarea::placeholder { color: ${C.t3}; }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      flex: fullPage ? 1 : undefined,
      height: fullPage ? undefined : "calc(100vh - 200px)",
      minHeight: 400,
      position: "relative",
    }}>
      {/* Messages area — scrolls */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
        }}
      >
        <div style={{
          display: "flex", flexDirection: "column", gap: 0,
          maxWidth: 680, width: "100%", margin: "0 auto",
          padding: "24px 0 16px",
        }}>
          {messages.map((m) => (
            <div key={m.id} style={{ padding: "12px 4px" }}>
              {m.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{
                    maxWidth: "85%",
                    background: C.l2,
                    borderRadius: "20px 20px 4px 20px",
                    padding: "12px 18px",
                    fontSize: 14, lineHeight: 1.6, fontFamily: FONT,
                    color: C.t1, wordBreak: "break-word",
                  }}>
                    {m.content}
                  </div>
                </div>
              ) : (
                <div
                  className="ai-resp"
                  style={{
                    fontSize: 14, lineHeight: 1.7, fontFamily: FONT,
                    color: C.t1, wordBreak: "break-word",
                    paddingLeft: 2,
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                />
              )}
            </div>
          ))}

          {loading && (
            <div style={{
              padding: "12px 4px",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 13, color: C.t3, fontFamily: FONT,
            }}>
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <span className="ai-dot" style={{ animationDelay: "0ms" }} />
                <span className="ai-dot" style={{ animationDelay: "150ms" }} />
                <span className="ai-dot" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to bottom */}
      {showScroll && (
        <button
          type="button"
          onClick={scrollToBottom}
          style={{
            position: "absolute",
            bottom: 90, left: "50%", transform: "translateX(-50%)",
            width: 32, height: 32, borderRadius: "50%",
            background: C.l3, border: `1px solid ${C.bd}`,
            color: C.t2, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            zIndex: 5,
          }}
        >
          <ArrowDown style={{ width: 14, height: 14 }} />
        </button>
      )}

      {/* Input bar — stays fixed, never scrolls */}
      <div style={{
        padding: "14px 0 0",
        paddingBottom: `max(24px, env(safe-area-inset-bottom, 12px))`,
        flexShrink: 0,
      }}>
        {inputBar}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes dotPulse {
          0%, 60%, 100% { opacity: 0.2; transform: scale(0.8); }
          30% { opacity: 0.8; transform: scale(1); }
        }
        .ai-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: ${C.t3};
          animation: dotPulse 1.2s ease-in-out infinite;
          display: inline-block;
        }
        .ai-resp p { margin: 0 0 10px; }
        .ai-resp p:last-child { margin: 0; }
        .ai-resp ul { margin: 6px 0 10px; padding-left: 20px; }
        .ai-resp ul:last-child { margin-bottom: 0; }
        .ai-resp li { margin: 3px 0; color: ${C.t2}; }
        .ai-resp strong { color: ${C.t1}; font-weight: 500; }
        .ai-resp em { color: ${C.t2}; }
        .ai-resp code {
          background: rgba(255,255,255,0.06);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.9em;
          font-family: monospace;
        }
        .ai-input-form textarea::placeholder { color: ${C.t3}; }
      `}</style>
    </div>
  );
};

export default AIAssistPanel;
