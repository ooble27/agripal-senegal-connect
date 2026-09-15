import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
      background: C.bg, color: C.t1, minHeight: "100vh",
      fontFamily: FONT,
      display: "flex", flexDirection: "column",
    }}>
      {/* Minimal top bar — just a back button */}
      <div style={{
        paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
        paddingBottom: 8,
        paddingLeft: 16, paddingRight: 16,
      }}>
        <Link
          to="/admin"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: C.t3, fontSize: 13, fontFamily: FONT,
            textDecoration: "none", transition: "color 0.15s",
            padding: "6px 0",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.t3; }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Administration
        </Link>
      </div>

      {/* Full-height chat */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        maxWidth: 780, width: "100%", margin: "0 auto",
        padding: "0 20px",
        minHeight: 0,
      }}>
        <AIAssistPanel fullPage />
      </div>
    </div>
  );
};

export default AdminAI;
