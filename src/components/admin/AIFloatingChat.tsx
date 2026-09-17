import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const OobleMascot = ({ size = 24, dark = false }: { size?: number; dark?: boolean }) => {
  const fill = dark ? "#111" : "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Ear tufts */}
      <path d="M12 16L8 4l10 8z" fill={fill} opacity="0.85" />
      <path d="M36 16l4-12-10 8z" fill={fill} opacity="0.85" />
      {/* Head */}
      <ellipse cx="24" cy="27" rx="16" ry="17" fill={fill} />
      {/* Left eye ring */}
      <circle cx="18" cy="25" r="7" fill={dark ? "#fff" : "#1a1a1a"} />
      <circle cx="18" cy="25" r="5" fill={dark ? "#111" : "#fff"} />
      {/* Left pupil */}
      <circle cx="19" cy="25" r="2.5" fill={dark ? "#fff" : "#1a1a1a"} />
      <circle cx="17.5" cy="23.8" r="1" fill={dark ? "#111" : "#fff"} />
      {/* Right eye ring */}
      <circle cx="30" cy="25" r="7" fill={dark ? "#fff" : "#1a1a1a"} />
      <circle cx="30" cy="25" r="5" fill={dark ? "#111" : "#fff"} />
      {/* Right pupil */}
      <circle cx="31" cy="25" r="2.5" fill={dark ? "#fff" : "#1a1a1a"} />
      <circle cx="29.5" cy="23.8" r="1" fill={dark ? "#111" : "#fff"} />
      {/* Beak */}
      <path d="M22 30l2 3.5 2-3.5z" fill={dark ? "#f5a623" : "#f5a623"} />
    </svg>
  );
};
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
          aria-label="oOble"
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
          <OobleMascot size={34} dark />
        </button>
      )}
    </>
  );
};

export default AIFloatingChat;
