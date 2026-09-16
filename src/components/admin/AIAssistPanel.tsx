import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown, Sparkles, TrendingUp, AlertTriangle, BarChart3, ArrowUp, Mail, Check, X } from "lucide-react";
import { contextChat, executeAction, isAIError, type ChatMessage, type PendingAction } from "@/lib/ai";
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
  pendingAction?: PendingAction;
  actionStatus?: "pending" | "executing" | "done" | "rejected" | "error";
  actionError?: string;
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

const TOOL_LABELS: Record<string, { icon: typeof Mail; label: string }> = {
  send_email: { icon: Mail, label: "Envoyer un email" },
};

function ActionCard({
  action,
  status,
  error,
  onConfirm,
  onReject,
}: {
  action: PendingAction;
  status: "pending" | "executing" | "done" | "rejected" | "error";
  error?: string;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const meta = TOOL_LABELS[action.tool] ?? { icon: Mail, label: action.tool };
  const Icon = meta.icon;
  const params = action.input as { to?: string; subject?: string; body?: string };

  if (status === "done") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", borderRadius: 10,
        background: "rgba(74, 222, 128, 0.08)",
        border: "1px solid rgba(74, 222, 128, 0.2)",
        fontSize: 13, fontFamily: FONT, color: "rgb(74, 222, 128)",
        marginTop: 8,
      }}>
        <Check style={{ width: 14, height: 14, flexShrink: 0 }} strokeWidth={2} />
        Email envoyé à {params.to}
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${C.bds}`,
        fontSize: 13, fontFamily: FONT, color: C.t3,
        marginTop: 8,
      }}>
        <X style={{ width: 14, height: 14, flexShrink: 0 }} strokeWidth={2} />
        Action annulée
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        fontSize: 13, fontFamily: FONT, color: "rgb(239, 68, 68)",
        marginTop: 8,
      }}>
        Erreur : {error || "L'action a échoué."}
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 10,
      background: C.l1,
      border: `1px solid ${C.bd}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10,
        borderBottom: `1px solid ${C.bds}`,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: C.l3, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon style={{ width: 14, height: 14, color: C.t2 }} strokeWidth={1.7} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.t1, fontFamily: FONT }}>
          {meta.label}
        </span>
      </div>

      <div style={{ padding: "12px 16px", fontSize: 12.5, fontFamily: FONT, color: C.t2 }}>
        {params.to && (
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: C.t3 }}>À : </span>
            <span style={{ color: C.t1 }}>{params.to}</span>
          </div>
        )}
        {params.subject && (
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: C.t3 }}>Sujet : </span>
            <span style={{ color: C.t1 }}>{params.subject}</span>
          </div>
        )}
        {params.body && (
          <div style={{
            marginTop: 8, padding: "10px 12px",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 8,
            fontSize: 12, lineHeight: 1.6, color: C.t2,
            maxHeight: 120, overflowY: "auto",
            whiteSpace: "pre-wrap",
          }}>
            {params.body.length > 300 ? params.body.slice(0, 300) + "…" : params.body}
          </div>
        )}
      </div>

      <div style={{
        padding: "10px 16px",
        borderTop: `1px solid ${C.bds}`,
        display: "flex", alignItems: "center", gap: 8,
        justifyContent: "flex-end",
      }}>
        <button
          type="button"
          onClick={onReject}
          disabled={status === "executing"}
          style={{
            height: 30, paddingLeft: 14, paddingRight: 14,
            borderRadius: 8, fontSize: 12, fontFamily: FONT,
            background: "transparent",
            border: `1px solid ${C.bd}`,
            color: C.t2, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            transition: "all 0.15s",
            opacity: status === "executing" ? 0.4 : 1,
          }}
          onMouseEnter={(e) => { if (status !== "executing") { e.currentTarget.style.borderColor = C.bdh; e.currentTarget.style.color = C.t1; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.color = C.t2; }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={status === "executing"}
          style={{
            height: 30, paddingLeft: 14, paddingRight: 14,
            borderRadius: 8, fontSize: 12, fontFamily: FONT, fontWeight: 500,
            background: C.accent,
            border: "none",
            color: "#111", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            transition: "all 0.15s",
            opacity: status === "executing" ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (status !== "executing") e.currentTarget.style.background = C.accentHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.accent; }}
        >
          {status === "executing" ? (
            <>
              <Loader2 style={{ width: 12, height: 12, animation: "spin 1.5s linear infinite" }} />
              Envoi…
            </>
          ) : (
            "Confirmer l'envoi"
          )}
        </button>
      </div>
    </div>
  );
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

  const hasPendingAction = messages.some(
    (m) => m.pendingAction && (m.actionStatus === "pending" || m.actionStatus === "executing"),
  );

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
    if (!text.trim() || loading || !ctx || hasPendingAction) return;
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
      pendingAction: res.pendingAction,
      actionStatus: res.pendingAction ? "pending" : undefined,
    }]);
  };

  const confirmAction = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg?.pendingAction || msg.actionStatus !== "pending") return;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionStatus: "executing" as const } : m)),
    );

    const history: ChatMessage[] = messages
      .filter((m) => m.id !== msgId)
      .map((m) => ({ role: m.role, content: m.content }));

    const freshCtx = await fetchPlatformContext();
    setCtx(freshCtx);

    const res = await executeAction({
      action: msg.pendingAction,
      messages: history,
      context: freshCtx,
    });

    if (isAIError(res)) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, actionStatus: "error" as const, actionError: res.error } : m)),
      );
      return;
    }

    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === msgId ? { ...m, actionStatus: "done" as const } : m,
      ),
      {
        id: crypto.randomUUID(), role: "assistant" as const,
        content: res.reply, timestamp: Date.now(),
      },
    ]);
  };

  const cancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionStatus: "rejected" as const } : m)),
    );
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
  const inputDisabled = loading || !ctx || hasPendingAction;

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
          opacity: hasPendingAction ? 0.5 : 1,
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
          onKeyDown={handleKeyDown}
          placeholder={hasPendingAction ? "Action en attente de confirmation…" : "Posez une question…"}
          disabled={inputDisabled}
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
          disabled={inputDisabled || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: input.trim() && !hasPendingAction ? C.accent : C.l3,
            border: "none",
            color: input.trim() && !hasPendingAction ? "#111" : C.t3,
            cursor: input.trim() && !hasPendingAction ? "pointer" : "default",
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

        <div style={{
          padding: "14px 0",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
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
                <>
                  {m.content && (
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
                  {m.pendingAction && m.actionStatus && (
                    <ActionCard
                      action={m.pendingAction}
                      status={m.actionStatus}
                      error={m.actionError}
                      onConfirm={() => confirmAction(m.id)}
                      onReject={() => cancelAction(m.id)}
                    />
                  )}
                </>
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

      <div style={{
        padding: "14px 0 0",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
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
