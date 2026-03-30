import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import waveLogo from "@/assets/wave-logo.png";
import orangeMoneyLogo from "@/assets/orange-money-logo.png";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

type ActiveTab = "overview" | "orders" | "profile" | "addresses";

const statusLabels: Record<string, { label: string; icon: string; color: string }> = {
  pending: { label: "En attente", icon: "schedule", color: "bg-tertiary/15 text-tertiary" },
  confirmed: { label: "Confirmée", icon: "check_circle", color: "bg-primary/15 text-primary" },
  preparing: { label: "En préparation", icon: "package_2", color: "bg-primary/15 text-primary" },
  shipped: { label: "En livraison", icon: "local_shipping", color: "bg-primary/20 text-primary" },
  delivered: { label: "Livrée", icon: "verified", color: "bg-primary-container text-primary-container-foreground" },
  cancelled: { label: "Annulée", icon: "cancel", color: "bg-destructive/10 text-destructive" },
};

const BuyerAccount = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Profile edit state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    // Fetch profile with address
    supabase.from("profiles").select("address").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setAddress(data.address || ""); });
    // Fetch orders
    supabase.from("orders").select("*").eq("buyer_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setOrders(data); setLoadingOrders(false); });
  }, [user]);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName,
        phone,
        city,
        address,
      }).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profil mis à jour !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (authLoading || !user) return null;

  const recentOrders = orders.slice(0, 3);
  const pendingCount = orders.filter(o => o.status === "pending" || o.status === "confirmed" || o.status === "preparing").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;
  const totalSpent = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: "overview", label: "Aperçu", icon: "dashboard" },
    { id: "orders", label: "Commandes", icon: "receipt_long" },
    { id: "profile", label: "Profil", icon: "person" },
    { id: "addresses", label: "Adresses", icon: "location_on" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-24">
        {/* Header */}
        <div className="bg-card border-b border-border/30">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-primary-container-foreground font-headline font-extrabold text-xl">
                {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-headline font-extrabold tracking-tighter truncate">
                  {profile?.full_name || "Mon Compte"}
                </h1>
                <p className="text-sm text-on-surface-variant truncate">{user.email}</p>
              </div>
              {/* Mobile hamburger for tabs */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  {mobileMenuOpen ? "close" : "menu"}
                </span>
              </button>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex gap-1 mt-6 -mb-px">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-headline font-bold transition-all ${
                    activeTab === tab.id
                      ? "bg-background text-foreground border border-border/30 border-b-0"
                      : "text-on-surface-variant hover:text-foreground hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile tab menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-headline font-bold transition-all ${
                    activeTab === tab.id ? "bg-primary-container text-primary-container-foreground" : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
              <button
                onClick={() => { signOut(); navigate("/"); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/10 transition-all"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Déconnexion
              </button>
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {/* ═══════ OVERVIEW ═══════ */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: "Commandes", value: orders.length, icon: "receipt_long", accent: false },
                  { label: "En cours", value: pendingCount, icon: "hourglass_top", accent: true },
                  { label: "Livrées", value: deliveredCount, icon: "verified", accent: false },
                  { label: "Dépensé", value: formatPrice(totalSpent), icon: "payments", accent: false },
                ].map((stat, i) => (
                  <div key={i} className={`rounded-2xl p-4 md:p-5 ${stat.accent ? "bg-primary-container" : "bg-card"} border border-border/20`}>
                    <span className={`material-symbols-outlined text-xl ${stat.accent ? "text-primary-container-foreground" : "text-on-surface-variant"}`}>
                      {stat.icon}
                    </span>
                    <div className={`text-2xl md:text-3xl font-headline font-extrabold mt-2 tracking-tighter ${stat.accent ? "text-primary-container-foreground" : ""}`}>
                      {stat.value}
                    </div>
                    <div className={`text-xs font-bold mt-0.5 ${stat.accent ? "text-primary-container-foreground/70" : "text-on-surface-variant"}`}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div className="bg-card rounded-2xl border border-border/20 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
                  <h2 className="font-headline font-extrabold text-base">Commandes récentes</h2>
                  <button onClick={() => setActiveTab("orders")} className="text-xs font-bold text-primary hover:underline">
                    Voir tout →
                  </button>
                </div>
                {loadingOrders ? (
                  <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant animate-spin">progress_activity</span>
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3">shopping_bag</span>
                    <p className="font-headline font-bold text-sm mb-1">Aucune commande</p>
                    <p className="text-on-surface-variant text-xs mb-4">Découvrez nos produits frais !</p>
                    <Link to="/marche" className="inline-block bg-primary-container text-primary-container-foreground px-5 py-2.5 rounded-full font-bold text-xs hover:scale-95 transition-transform">
                      Explorer le Marché
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/15">
                    {recentOrders.map(order => {
                      const s = statusLabels[order.status] || statusLabels.pending;
                      return (
                        <div key={order.id} className="px-5 py-4 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                              #{order.id.slice(0, 8)}
                            </div>
                            <div className="font-headline font-extrabold text-base mt-0.5">{formatPrice(order.total)}</div>
                            <div className="text-xs text-on-surface-variant">
                              {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                              {order.payment_method && (
                                <span className="ml-2 inline-flex items-center gap-1">
                                  <img
                                    src={order.payment_method === "wave" ? waveLogo : orangeMoneyLogo}
                                    alt=""
                                    className="w-3.5 h-3.5 rounded-full object-cover inline"
                                  />
                                  {order.payment_method === "wave" ? "Wave" : "Orange Money"}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${s.color}`}>
                            <span className="material-symbols-outlined text-xs">{s.icon}</span>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Link to="/marche" className="bg-card rounded-2xl p-5 border border-border/20 hover:border-primary/30 transition-colors group">
                  <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform inline-block">storefront</span>
                  <div className="font-headline font-extrabold text-sm mt-2">Explorer le Marché</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">Produits frais locaux</div>
                </Link>
                <button onClick={() => setActiveTab("profile")} className="bg-card rounded-2xl p-5 border border-border/20 hover:border-primary/30 transition-colors text-left group">
                  <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform inline-block">edit</span>
                  <div className="font-headline font-extrabold text-sm mt-2">Modifier mon Profil</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">Infos & préférences</div>
                </button>
                <Link to="/devenir-producteur" className="bg-card rounded-2xl p-5 border border-border/20 hover:border-primary/30 transition-colors group col-span-2 md:col-span-1">
                  <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform inline-block">eco</span>
                  <div className="font-headline font-extrabold text-sm mt-2">Devenir Vendeur</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">Vendez vos produits</div>
                </Link>
              </div>
            </motion.div>
          )}

          {/* ═══════ ORDERS ═══════ */}
          {activeTab === "orders" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-xl font-headline font-extrabold tracking-tighter mb-4">Toutes mes commandes</h2>
              {loadingOrders ? (
                <div className="py-16 text-center">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-border/20">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3">receipt_long</span>
                  <p className="font-headline font-bold text-base mb-1">Aucune commande</p>
                  <p className="text-on-surface-variant text-sm mb-5">Vos commandes apparaîtront ici.</p>
                  <Link to="/marche" className="inline-block bg-primary-container text-primary-container-foreground px-6 py-3 rounded-full font-bold text-sm hover:scale-95 transition-transform">
                    Découvrir le Marché
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order, i) => {
                    const s = statusLabels[order.status] || statusLabels.pending;
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-card rounded-2xl p-5 border border-border/20"
                      >
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                          <div>
                            <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                              Commande #{order.id.slice(0, 8)}
                            </div>
                            <div className="text-xl font-headline font-extrabold mt-1">{formatPrice(order.total)}</div>
                            <div className="text-sm text-on-surface-variant mt-1">
                              {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                            </div>
                          </div>
                          <span className={`self-start px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${s.color}`}>
                            <span className="material-symbols-outlined text-sm">{s.icon}</span>
                            {s.label}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                          {order.payment_method && (
                            <span className="flex items-center gap-1.5">
                              <img
                                src={order.payment_method === "wave" ? waveLogo : orangeMoneyLogo}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover"
                              />
                              {order.payment_method === "wave" ? "Wave" : "Orange Money"}
                            </span>
                          )}
                          {order.shipping_city && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-base">location_on</span>
                              {order.shipping_city}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════ PROFILE ═══════ */}
          {activeTab === "profile" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
              <h2 className="text-xl font-headline font-extrabold tracking-tighter mb-5">Mon Profil</h2>
              <div className="bg-card rounded-2xl p-6 border border-border/20 space-y-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Nom complet</label>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-surface-container-low rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-primary-container text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Email</label>
                  <input
                    value={user.email || ""}
                    disabled
                    className="w-full bg-surface-container-low rounded-xl p-3.5 text-sm opacity-60 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Téléphone</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="77 000 00 00"
                    type="tel"
                    className="w-full bg-surface-container-low rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-primary-container text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Ville</label>
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Dakar"
                    className="w-full bg-surface-container-low rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-primary-container text-sm"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-primary-container text-primary-container-foreground py-3.5 rounded-full font-headline font-extrabold text-sm hover:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>

              <div className="mt-6 bg-card rounded-2xl p-6 border border-border/20">
                <h3 className="font-headline font-extrabold text-sm mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-destructive">warning</span>
                  Zone dangereuse
                </h3>
                <button
                  onClick={() => { signOut(); navigate("/"); }}
                  className="w-full border border-destructive/30 text-destructive py-3 rounded-xl font-bold text-sm hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Se déconnecter
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════ ADDRESSES ═══════ */}
          {activeTab === "addresses" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
              <h2 className="text-xl font-headline font-extrabold tracking-tighter mb-5">Mes Adresses</h2>
              <div className="bg-card rounded-2xl p-6 border border-border/20 space-y-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Adresse principale</label>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    rows={3}
                    placeholder="Votre adresse complète de livraison"
                    className="w-full bg-surface-container-low rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-primary-container text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Ville</label>
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Dakar"
                    className="w-full bg-surface-container-low rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-primary-container text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-1 block">Téléphone</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="77 000 00 00"
                    type="tel"
                    className="w-full bg-surface-container-low rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-primary-container text-sm"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-primary-container text-primary-container-foreground py-3.5 rounded-full font-headline font-extrabold text-sm hover:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer l'adresse"}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BuyerAccount;
