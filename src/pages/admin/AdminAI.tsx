import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AIAssistPanel from "@/components/admin/AIAssistPanel";
import { C, FONT, ADMIN_THEME_CSS, ADMIN_BG } from "@/components/admin/adminTheme";

const AdminAI = () => {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;

    const style = document.createElement("style");
    style.textContent = ADMIN_THEME_CSS;
    document.head.appendChild(style);

    const meta = document.querySelector('meta[name="theme-color"]');
    const prevTheme = meta?.getAttribute("content") ?? "";

    const sync = () => {
      const isDark = html.classList.contains("dark");
      const bg = isDark ? ADMIN_BG.dark : ADMIN_BG.light;
      html.style.backgroundColor = bg;
      body.style.backgroundColor = bg;
      meta?.setAttribute("content", bg);
    };
    sync();
    body.style.overflow = "hidden";

    const obs = new MutationObserver(sync);
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });

    return () => {
      obs.disconnect();
      document.head.removeChild(style);
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      body.style.overflow = "";
      if (meta) meta.setAttribute("content", prevTheme);
    };
  }, []);

  return (
    <div className="admin-scope ai-page" style={{
      background: C.bg, color: C.t1,
      fontFamily: FONT,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      position: "fixed", inset: 0,
    }}>
      {/* Back button — top left */}
      <div style={{
        paddingTop: "max(10px, env(safe-area-inset-top, 0px))",
        paddingBottom: 4,
        paddingLeft: 16, paddingRight: 16,
        flexShrink: 0,
      }}>
        <Link
          to="/admin"
          aria-label="Retour"
          style={{
            width: 36, height: 36, borderRadius: 10,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: C.t2, textDecoration: "none", transition: "all 0.15s",
            background: C.l1, border: `1px solid ${C.bds}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; e.currentTarget.style.borderColor = C.bd; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.t2; e.currentTarget.style.borderColor = C.bds; }}
        >
          <ArrowLeft style={{ width: 18, height: 18 }} strokeWidth={1.8} />
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
