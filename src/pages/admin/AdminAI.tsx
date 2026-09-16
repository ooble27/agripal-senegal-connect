import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import AIAssistPanel from "@/components/admin/AIAssistPanel";
import { C, FONT } from "@/components/admin/adminTheme";

const AdminAI = () => {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    html.style.backgroundColor = C.bg;
    body.style.backgroundColor = C.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevTheme = meta?.getAttribute("content") ?? "";
    meta?.setAttribute("content", C.bg);
    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      if (meta) meta.setAttribute("content", prevTheme);
    };
  }, []);

  return (
    <div style={{
      background: C.bg, color: C.t1,
      height: "100vh",
      fontFamily: FONT,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Close button — top right */}
      <div style={{
        paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
        paddingBottom: 4,
        paddingLeft: 20, paddingRight: 20,
        display: "flex", justifyContent: "flex-end",
      }}>
        <Link
          to="/admin"
          aria-label="Fermer"
          style={{
            width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.t3, textDecoration: "none", transition: "all 0.15s",
            background: "transparent",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; e.currentTarget.style.background = C.l2; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.t3; e.currentTarget.style.background = "transparent"; }}
        >
          <X style={{ width: 20, height: 20 }} strokeWidth={1.8} />
        </Link>
      </div>

      {/* Full-height chat */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        maxWidth: 780, width: "100%", margin: "0 auto",
        padding: "0 20px",
        paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        minHeight: 0,
      }}>
        <AIAssistPanel fullPage />
      </div>
    </div>
  );
};

export default AdminAI;
