import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Inbox, ShoppingCart, ScanFace, Calculator, Users, ArrowLeft,
  BadgeCheck, UserRound, Megaphone, Headphones, ShieldCheck, ScrollText,
  LayoutDashboard, Bell, Wallet, Mail, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, type AppRole } from "@/lib/auth";
import { type AdminOrder } from "@/lib/adminOrders";
import { fetchAdminOrders, persistOrderPatch, deleteOrder } from "@/lib/adminOrdersLive";
import { supabase } from "@/integrations/supabase/client";
import OrdersQueue from "@/components/admin/OrdersQueue";
import OrdersList from "@/components/admin/OrdersList";
import OrderDetail from "@/components/admin/OrderDetail";
import KycPanel from "@/components/admin/KycPanel";
import AccountingPanel from "@/components/admin/AccountingPanel";
import TeamPanel from "@/components/admin/TeamPanel";
import ClientProfile from "@/components/admin/ClientProfile";
import CompliancePanel from "@/components/admin/CompliancePanel";
import AuditLogPanel from "@/components/admin/AuditLogPanel";
import KpiDashboard from "@/components/admin/KpiDashboard";
import AnnouncementsPanel from "@/components/admin/AnnouncementsPanel";
import TreasuryPanel from "@/components/admin/TreasuryPanel";
import MailboxPanel from "@/components/admin/MailboxPanel";
import CampaignsPanel from "@/components/admin/CampaignsPanel";
import { C, FONT } from "@/components/admin/adminTheme";

type TabId = "dashboard" | "queue" | "orders" | "kyc" | "accounting" | "compliance" | "treasury" | "mailbox" | "campaigns" | "announcements" | "team" | "audit" | "ai";

const NAV: { id: TabId; label: string; desc: string; icon: typeof Inbox }[] = [
  { id: "dashboard",  label: "Tableau de bord", desc: "Vue d'ensemble : volumes, marge, alertes et actions à traiter.", icon: LayoutDashboard },
  { id: "queue",      label: "File d'attente", desc: "Prenez une commande en charge avant de la traiter — elle se verrouille pour l'équipe.", icon: Inbox },
  { id: "orders",     label: "Commandes",      desc: "Toutes les commandes et leur historique.", icon: ShoppingCart },
  { id: "kyc",        label: "KYC",            desc: "Vérifiez l'identité des clients avant leurs transactions.", icon: ScanFace },
  { id: "accounting",  label: "Comptabilité",   desc: "Revenus, marges et volumes traités.", icon: Calculator },
  { id: "compliance",  label: "Conformité",     desc: "Alertes CANAFE, déclarations, dossiers et programme de conformité.", icon: ShieldCheck },
  { id: "treasury",    label: "Trésorerie",     desc: "Inventaire USDT multi-réseaux, snapshots, mouvements et alertes de solde bas.", icon: Wallet },
  { id: "mailbox",     label: "Messagerie",     desc: "Envoyer un e-mail à un client à partir d'un template, historique des envois, boîte de réception.", icon: Mail },
  { id: "ai",         label: "Assistant IA",   desc: "Posez des questions à l'IA sur l'état de la plateforme, les commandes et les clients.", icon: Bot },
  { id: "campaigns",   label: "Campagnes",      desc: "Campagnes marketing bien designées avec segmentation, aperçu live et historique.", icon: Megaphone },
  { id: "announcements", label: "Annonces",     desc: "Bannière publique et mode maintenance côté client.", icon: Bell },
  { id: "team",        label: "Équipe",         desc: "Membres, rôles et permissions du back-office.", icon: Users },
  { id: "audit",       label: "Journal d'audit", desc: "Historique immuable de toutes les actions administratives.", icon: ScrollText },
];

const ROLE_TABS: Record<AppRole, TabId[]> = {
  admin:        ["dashboard", "queue", "orders", "kyc", "accounting", "compliance", "treasury", "mailbox", "ai", "campaigns", "announcements", "team", "audit"],
  operator:     ["queue", "orders", "mailbox", "ai"],
  kyc_reviewer: ["kyc", "mailbox"],
  support:      ["queue", "orders", "mailbox", "ai"],
  marketing:    ["mailbox", "campaigns", "announcements", "accounting"],
};

const ROLE_LABEL: Partial<Record<AppRole, string>> = {
  admin: "Admin",
  operator: "Opérateur",
  kyc_reviewer: "KYC",
  support: "Support",
  marketing: "Marketing",
};

const ROLE_ICON: Record<AppRole, typeof BadgeCheck> = {
  admin: BadgeCheck,
  operator: UserRound,
  kyc_reviewer: ScanFace,
  support: Headphones,
  marketing: Megaphone,
};

const AdminPortal = () => {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [clientView, setClientView] = useState<{ userId: string; name: string } | null>(null);

  const allowedTabs = useMemo(() => {
    const set = new Set<TabId>();
    for (const r of roles) {
      for (const t of ROLE_TABS[r] ?? []) set.add(t);
    }
    return set;
  }, [roles]);

  const visibleNav = useMemo(() => NAV.filter((n) => allowedTabs.has(n.id)), [allowedTabs]);
  const [tab, setTab] = useState<TabId>(visibleNav[0]?.id ?? "queue");

  useEffect(() => {
    if (visibleNav.length > 0 && !allowedTabs.has(tab)) {
      setTab(visibleNav[0].id);
    }
  }, [visibleNav, allowedTabs, tab]);

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

  const topRole = roles.includes("admin") ? "admin" : roles[0];
  const badgeLabel = ROLE_LABEL[topRole] ?? "Staff";
  const BadgeIcon = ROLE_ICON[topRole] ?? BadgeCheck;

  const refresh = () => fetchAdminOrders().then((rows) => { setOrders(rows); setLoading(false); });

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const patch = (id: string, changes: Partial<AdminOrder>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...changes } : o)));
    setSelected((s) => (s && s.id === id ? { ...s, ...changes } : s));
    persistOrderPatch(id, changes).then((res) => { if (res.error) refresh(); });
  };

  const remove = (id: string) => {
    setSelected(null);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    deleteOrder(id).then((res) => { if (res.error) refresh(); });
  };

  const active = visibleNav.find((n) => n.id === tab) ?? visibleNav[0];
  if (!active) return null;
  const ActiveIcon = active.icon;
  const openOrder = (o: AdminOrder) => setSelected(o);

  const showClient = (userId: string) => {
    const name = selected?.clientName ?? "Client";
    setClientView({ userId, name });
  };

  const openOrderById = (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    if (o) {
      setClientView(null);
      setSelected(o);
    }
  };

  const navigateTab = (target: "queue" | "orders" | "compliance") => {
    if (allowedTabs.has(target)) setTab(target);
  };

  return (
    <div
      className="admin-scope"
      style={{ background: C.bg, color: C.t1, minHeight: "100vh", fontFamily: FONT }}
    >
      {/* Barre du haut — sombre Terex */}
      {/* Barre du haut — plus de filet sous la barre : la respiration seule
          suffit à séparer visuellement l'en-tête des pastilles. */}
      <div style={{ background: C.bg }}>
        <div
          className="mx-auto flex max-w-[1200px] items-center gap-3 px-5 md:px-8"
          style={{ paddingTop: "max(16px, env(safe-area-inset-top, 0px))", paddingBottom: 16 }}
        >
          <Link
            to="/app"
            aria-label="Retour à l'app"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: C.l1, border: `1px solid ${C.bds}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.t2, transition: "all 0.15s", flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; e.currentTarget.style.borderColor = C.bd; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.t2; e.currentTarget.style.borderColor = C.bds; }}
          >
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 style={{ fontSize: 18, fontWeight: 400, color: C.t1, margin: 0, letterSpacing: "-0.01em" }}>
              Administration
            </h1>
            <p style={{ fontSize: 11.5, color: C.t3, margin: "2px 0 0", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              Pilotez la plateforme Ooble
            </p>
          </div>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: C.l1, border: `1px solid ${C.bds}`, borderRadius: 999,
              padding: "6px 12px", fontSize: 11, fontWeight: 400, color: C.t2, flexShrink: 0,
            }}
          >
            <BadgeIcon style={{ width: 12, height: 12 }} /> {badgeLabel}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8">
        {clientView ? (
          <ClientProfile
            userId={clientView.userId}
            clientName={clientView.name}
            onBack={() => setClientView(null)}
            onOpenOrder={openOrderById}
          />
        ) : selected ? (
          <div>
            {/* Pastilles de navigation — masquées quand une commande est ouverte */}
            <OrderDetail order={selected} onBack={() => setSelected(null)} onPatch={patch} onDelete={remove} onShowClient={showClient} />
          </div>
        ) : (
          <>
            {/* Pastilles de navigation — texture Ooble d'origine, défilables */}
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
              {visibleNav.map(({ id, label, icon: Icon }) => {
                const on = id === tab;
                return (
                  <button
                    key={id}
                    onClick={() => { if (id === "ai") { navigate("/admin/ai"); return; } setTab(id); setSelected(null); }}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors",
                      on
                        ? "border-white bg-white text-[#111]"
                        : "border-[#2a2a2a] bg-[#212121] text-[#888] hover:bg-[#282828] hover:text-[#f0f0f0]",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={on ? 2 : 1.7} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Titre de section — masqué pour le tableau de bord (en-tête propre) */}
            {tab !== "dashboard" && (
              <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: C.l1, border: `1px solid ${C.bds}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.t2,
                }}>
                  <ActiveIcon style={{ width: 18, height: 18 }} strokeWidth={1.8} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 400, color: C.t1, margin: 0, letterSpacing: "-0.015em" }}>
                    {active.label}
                  </h2>
                  <p style={{ fontSize: 11.5, color: C.t3, margin: "2px 0 0" }}>
                    {active.desc}
                  </p>
                </div>
              </div>
            )}

            {/* Vue active */}
            <div style={{ marginTop: tab === "dashboard" ? 26 : 22 }}>
              {loading && (tab === "queue" || tab === "orders" || tab === "accounting" || tab === "compliance") ? (
                <div style={{
                  ...{ background: C.l1, border: `1px solid ${C.bds}`, borderRadius: 14 },
                  padding: "60px 20px", textAlign: "center", fontSize: 12.5, color: C.t3,
                }}>
                  Chargement des commandes…
                </div>
              ) : (
                <>
                  {tab === "dashboard" && <KpiDashboard orders={orders} onNavigate={navigateTab} />}
                  {tab === "queue" && <OrdersQueue orders={orders} onOpen={openOrder} onPatch={patch} />}
                  {tab === "orders" && <OrdersList orders={orders} onOpen={openOrder} />}
                  {tab === "kyc" && <KycPanel />}
                  {tab === "accounting" && <AccountingPanel orders={orders} />}
                  {tab === "compliance" && <CompliancePanel orders={orders} />}
                  {tab === "treasury" && <TreasuryPanel orders={orders} />}
                  {tab === "mailbox" && <MailboxPanel />}
                  {tab === "campaigns" && <CampaignsPanel />}
                  {tab === "announcements" && <AnnouncementsPanel />}
                  {tab === "team" && <TeamPanel />}
                  {tab === "audit" && <AuditLogPanel />}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPortal;
