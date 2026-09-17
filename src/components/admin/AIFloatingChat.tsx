import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const OobleMascot = ({ size = 24, light = false }: { size?: number; light?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <defs>
      <radialGradient id="ob-body" cx="0.4" cy="0.35" r="0.65">
        <stop offset="0%" stopColor={light ? "#666" : "#e0e0e0"} />
        <stop offset="100%" stopColor={light ? "#333" : "#a0a0a0"} />
      </radialGradient>
      <radialGradient id="ob-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor={light ? "#555" : "#fff"} stopOpacity="0.25" />
        <stop offset="100%" stopColor={light ? "#555" : "#fff"} stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Soft glow behind */}
    <ellipse cx="32" cy="34" rx="22" ry="20" fill="url(#ob-glow)" />
    {/* Body — organic blob shape */}
    <path
      d="M16 28c0-10 5.5-18 16-18s16 8 16 18c0 11-6 20-16 20S16 39 16 28z"
      fill="url(#ob-body)"
    />
    {/* Highlight on top */}
    <ellipse cx="28" cy="16" rx="7" ry="3" fill={light ? "#777" : "#fff"} opacity="0.3" />
    {/* Left eye */}
    <ellipse cx="25" cy="27" rx="4.5" ry="5.5" fill={light ? "#111" : "#1a1a1a"} />
    <ellipse cx="26" cy="25.5" rx="2" ry="2.2" fill={light ? "#eee" : "#fff"} />
    <circle cx="24" cy="29" r="0.9" fill={light ? "#eee" : "#fff"} opacity="0.5" />
    {/* Right eye */}
    <ellipse cx="39" cy="27" rx="4.5" ry="5.5" fill={light ? "#111" : "#1a1a1a"} />
    <ellipse cx="40" cy="25.5" rx="2" ry="2.2" fill={light ? "#eee" : "#fff"} />
    <circle cx="38" cy="29" r="0.9" fill={light ? "#eee" : "#fff"} opacity="0.5" />
    {/* Smile */}
    <path
      d="M26 35q6 5.5 12 0"
      stroke={light ? "#111" : "#1a1a1a"}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    {/* Blush cheeks */}
    <ellipse cx="21" cy="33" rx="3" ry="2" fill={light ? "#c06060" : "#ff9090"} opacity="0.25" />
    <ellipse cx="43" cy="33" rx="3" ry="2" fill={light ? "#c06060" : "#ff9090"} opacity="0.25" />
  </svg>
);
import AIAssistPanel from "./AIAssistPanel";
import { C, FONT } from "./adminTheme";

const AIFloatingChat = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open]);

  return (
    <>
      {/* Chat panel — always mounted, hidden via CSS to keep state */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          width: "calc(100% - 32px)",
          maxWidth: 440,
          height: "calc(100dvh - 100px)",
          maxHeight: 700,
          borderRadius: 20,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease",
          fontFamily: FONT,
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px 10px",
          flexShrink: 0,
          borderBottom: `1px solid ${C.bds}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 10,
              background: C.l2, border: `1px solid ${C.bds}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.t2,
            }}>
              <OobleMascot size={22} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 400, color: C.t1 }}>
              oOble
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "transparent",
              border: `1px solid ${C.bds}`,
              color: C.t3,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; e.currentTarget.style.borderColor = C.bd; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.t3; e.currentTarget.style.borderColor = C.bds; }}
          >
            <X style={{ width: 16, height: 16 }} strokeWidth={2} />
          </button>
        </div>

        {/* Chat body */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          padding: "0 12px",
        }}>
          <AIAssistPanel fullPage />
        </div>
      </div>

      {/* Backdrop on mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 99,
          }}
        />
      )}

      {/* Floating bubble — hidden when panel is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Assistant IA"
          style={{
            position: "fixed",
            bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
            right: 20,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: C.accent,
            border: "none",
            color: "#111",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            zIndex: 101,
          }}
        >
          <OobleMascot size={34} light />
        </button>
      )}
    </>
  );
};

export default AIFloatingChat;
