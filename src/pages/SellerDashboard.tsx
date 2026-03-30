import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type Product = Tables<"products">;
type Shop = Tables<"shops">;
type OrderItemWithProduct = Tables<"order_items"> & { products: { name: string; image_url: string | null } | null };

const SellerDashboard = () => {
  const { user, profile, signOut, role } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderItemWithProduct[]>([]);
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("overview");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Shop form
  const [shopName, setShopName] = useState("");
  const [shopDesc, setShopDesc] = useState("");
  const [shopLocation, setShopLocation] = useState("");
  const [shopCity, setShopCity] = useState("");
  const [shopPhone, setShopPhone] = useState("");

  // Product form
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodUnit, setProdUnit] = useState("le kg");
  const [prodStock, setProdStock] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [prodImage, setProdImage] = useState<File | null>(null);

  useEffect(() => {
    if (role !== "seller") {
      navigate("/");
      return;
    }
    loadData();
  }, [user, role]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Load profile avatar
    const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single();
    if (prof?.avatar_url) setAvatarUrl(prof.avatar_url);

    const [{ data: shopData }, { data: cats }] = await Promise.all([
      supabase.from("shops").select("*").eq("seller_id", user.id).single(),
      supabase.from("categories").select("*"),
    ]);
    if (cats) setCategories(cats);
    if (shopData) {
      setShop(shopData);
      const [{ data: prods }, { data: orderItems }] = await Promise.all([
        supabase.from("products").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false }),
        supabase.from("order_items").select("*, products(name, image_url)").eq("shop_id", shopData.id).order("created_at", { ascending: false }).limit(20),
      ]);
      if (prods) setProducts(prods);
      if (orderItems) setOrders(orderItems as OrderItemWithProduct[]);
    } else {
      setShowCreateShop(true);
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { toast.error("Erreur upload photo"); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    setAvatarUrl(publicUrl);
    toast.success("Photo de profil mise à jour !");
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { data, error } = await supabase.from("shops").insert({
      seller_id: user.id,
      name: shopName,
      description: shopDesc,
      location: shopLocation,
      city: shopCity,
      phone: shopPhone,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setShop(data);
    setShowCreateShop(false);
    toast.success("Boutique créée !");
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    let imageUrl: string | null = null;
    if (prodImage) {
      const ext = prodImage.name.split(".").pop();
      const path = `${shop.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, prodImage);
      if (uploadErr) { toast.error("Erreur upload image"); return; }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }
    const { error } = await supabase.from("products").insert({
      shop_id: shop.id,
      name: prodName,
      description: prodDesc,
      price: parseInt(prodPrice),
      unit: prodUnit,
      stock: parseInt(prodStock) || 0,
      category_id: prodCategory || null,
      image_url: imageUrl,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Produit ajouté !");
    setShowAddProduct(false);
    setProdName(""); setProdDesc(""); setProdPrice(""); setProdStock(""); setProdCategory("");
    setProdImage(null);
    loadData();
  };

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  const totalRevenue = orders.reduce((s, o) => s + o.unit_price * o.quantity, 0);

  // Chart data based on real orders grouped by week
  const chartData = orders.length > 0
    ? (() => {
        const weeks: Record<string, number> = {};
        orders.forEach(o => {
          const d = new Date(o.created_at);
          const weekNum = Math.ceil(d.getDate() / 7);
          const key = `Sem ${weekNum}`;
          weeks[key] = (weeks[key] || 0) + o.unit_price * o.quantity;
        });
        return Object.entries(weeks).map(([name, value]) => ({ name, value }));
      })()
    : [];

  const navItems = [
    { id: "overview", icon: "dashboard", label: "Vue d'ensemble" },
    { id: "products", icon: "eco", label: "Mes Produits" },
    { id: "sales", icon: "trending_up", label: "Ventes" },
    { id: "payments", icon: "account_balance_wallet", label: "Paiements" },
    { id: "settings", icon: "settings", label: "Paramètres" },
  ];

  const getProductStatus = (p: Product) => {
    if (p.stock === 0) return { label: "Épuisé", cls: "bg-destructive/10 text-destructive" };
    if (p.stock <= 10) return { label: "Stock faible", cls: "bg-tertiary/20 text-tertiary-foreground" };
    return { label: "En vente", cls: "bg-primary-container/20 text-primary" };
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
    </div>
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-body flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`h-screen w-72 fixed left-0 top-0 bg-background font-headline flex flex-col p-8 gap-8 z-50 border-r border-border/30 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold tracking-tight text-foreground leading-tight">
              {shop?.name || "Ma Boutique"}
            </h2>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Vendeur vérifié</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-grow">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveNav(item.id); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
                activeNav === item.id
                  ? "bg-primary-container text-primary-container-foreground shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-foreground"
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button onClick={signOut} className="flex items-center gap-3 px-5 py-3.5 text-destructive font-bold hover:bg-destructive/10 rounded-2xl transition-colors text-sm">
          <span className="material-symbols-outlined text-xl">logout</span>
          Déconnexion
        </button>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 flex-1 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl px-5 md:px-10 py-4 md:py-5 flex items-center justify-between border-b border-border/20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-full hover:bg-surface-container">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <h3 className="text-lg font-headline font-bold text-on-surface-variant">Tableau de Bord</h3>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-right hidden md:block">
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Solde disponible</div>
              <div className="text-base font-headline font-extrabold text-primary">{formatPrice(totalRevenue)}</div>
            </div>
            <button className="relative p-2">
              <span className="material-symbols-outlined text-on-surface-variant text-2xl">notifications</span>
            </button>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center group"
              title="Changer la photo de profil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              )}
              <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-surface text-sm">photo_camera</span>
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
          </div>
        </header>

        <div className="px-5 md:px-10 pb-12">
          {/* Create Shop Modal */}
          {showCreateShop && (
            <div className="fixed inset-0 bg-foreground/50 z-[100] flex items-center justify-center p-6">
              <div className="bg-card rounded-3xl p-10 max-w-lg w-full shadow-2xl">
                <h2 className="text-2xl font-headline font-extrabold mb-2">Créer votre boutique</h2>
                <p className="text-on-surface-variant text-sm mb-8">Remplissez les informations de votre boutique pour commencer à vendre.</p>
                <form onSubmit={handleCreateShop} className="space-y-4">
                  <input value={shopName} onChange={e => setShopName(e.target.value)} required placeholder="Nom de la boutique (ex: Ferme Keur Moussa)" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  <textarea value={shopDesc} onChange={e => setShopDesc(e.target.value)} placeholder="Description de votre boutique" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" rows={3} />
                  <div className="grid grid-cols-2 gap-4">
                    <input value={shopLocation} onChange={e => setShopLocation(e.target.value)} placeholder="Localisation (ex: Sangalkam)" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                    <input value={shopCity} onChange={e => setShopCity(e.target.value)} placeholder="Ville (ex: Thiès)" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  </div>
                  <input value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="Téléphone (77 000 00 00)" type="tel" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  <button type="submit" className="w-full bg-primary-container text-primary-container-foreground py-4 rounded-full font-headline font-extrabold text-base hover:scale-[0.97] transition-transform mt-4">
                    Créer ma boutique
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Add Product Modal */}
          {showAddProduct && (
            <div className="fixed inset-0 bg-foreground/50 z-[100] flex items-center justify-center p-6">
              <div className="bg-card rounded-3xl p-10 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-headline font-extrabold">Nouveau Produit</h2>
                    <p className="text-on-surface-variant text-sm">Publiez un nouveau produit sur le marché.</p>
                  </div>
                  <button onClick={() => setShowAddProduct(false)} className="text-on-surface-variant hover:text-foreground p-2 rounded-full hover:bg-surface-container-low">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <input value={prodName} onChange={e => setProdName(e.target.value)} required placeholder="Nom du produit (ex: Carottes de Niayes)" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  <textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="Description du produit" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" rows={3} />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Prix (FCFA)</label>
                      <input value={prodPrice} onChange={e => setProdPrice(e.target.value)} required type="number" min="1" placeholder="1250" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Unité</label>
                      <select value={prodUnit} onChange={e => setProdUnit(e.target.value)} className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm">
                        <option>le kg</option>
                        <option>la caisse</option>
                        <option>le lot</option>
                        <option>la pièce</option>
                        <option>250g</option>
                        <option>500g</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Stock</label>
                      <input value={prodStock} onChange={e => setProdStock(e.target.value)} type="number" min="0" placeholder="500" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Catégorie</label>
                      <select value={prodCategory} onChange={e => setProdCategory(e.target.value)} className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm">
                        <option value="">Sélectionner</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Photo du produit</label>
                    <input type="file" accept="image/*" onChange={e => setProdImage(e.target.files?.[0] || null)} className="w-full bg-surface-container-low rounded-2xl p-4 text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-primary-container text-primary-container-foreground py-4 rounded-full font-headline font-extrabold text-base hover:scale-[0.97] transition-transform mt-4">
                    Publier le produit
                  </button>
                </form>
              </div>
            </div>
          )}

          {shop && (
            <>
              {/* Welcome */}
              <div className="mb-10 mt-8">
                <h1 className="text-4xl font-extrabold tracking-tight">Bonjour, {profile?.full_name || "Vendeur"}</h1>
                <p className="text-on-surface-variant mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">storefront</span>
                  {shop.name}
                </p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                <div className="bg-primary-container p-7 rounded-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-primary-container-foreground/60 text-2xl">account_balance</span>
                    <span className="text-[10px] font-extrabold text-primary-container-foreground/60 uppercase tracking-[0.15em]">Solde actuel</span>
                  </div>
                  <div className="text-3xl font-black text-primary-container-foreground">{formatPrice(totalRevenue)}</div>
                </div>
                <div className="bg-surface-container-lowest p-7 rounded-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-on-surface-variant text-2xl">trending_up</span>
                    <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Ventes totales</span>
                  </div>
                  <div className="text-3xl font-black text-foreground">{formatPrice(totalRevenue)}</div>
                </div>
                <div className="bg-surface-container-lowest p-7 rounded-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-on-surface-variant text-2xl">shopping_cart</span>
                    <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Commandes</span>
                  </div>
                  <div className="text-3xl font-black text-foreground">{orders.length}</div>
                </div>
                <div className="bg-surface-container-lowest p-7 rounded-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-on-surface-variant text-2xl">inventory_2</span>
                    <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Produits actifs</span>
                  </div>
                  <div className="text-3xl font-black text-foreground">{products.filter(p => p.is_active).length}</div>
                </div>
              </div>

              {/* Chart + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-3xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-extrabold">Aperçu des ventes</h3>
                  </div>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--on-surface-variant))" }} />
                        <YAxis hide />
                        <Tooltip formatter={(value: number) => formatPrice(value)} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-on-surface-variant">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">bar_chart</span>
                        <p className="text-sm">Les données de ventes apparaîtront ici</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-extrabold">Actions Rapides</h3>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="w-full flex items-center gap-4 bg-surface-container-lowest p-5 rounded-3xl hover:bg-surface-container-low transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary-container-foreground">add</span>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">Ajouter un produit</div>
                      <div className="text-xs text-on-surface-variant">Publier un nouveau produit</div>
                    </div>
                  </button>
                  <button className="w-full flex items-center gap-4 bg-surface-container-lowest p-5 rounded-3xl hover:bg-surface-container-low transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant">account_balance</span>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">Demander un virement</div>
                      <div className="text-xs text-on-surface-variant">Wave / Orange Money</div>
                    </div>
                  </button>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full flex items-center gap-4 bg-surface-container-lowest p-5 rounded-3xl hover:bg-surface-container-low transition-colors"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant">photo_camera</span>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">Photo de profil</div>
                      <div className="text-xs text-on-surface-variant">Visible par les acheteurs</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Products + Sales in two columns */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Products Table */}
                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-extrabold">Gestion des Produits</h3>
                    <button
                      onClick={() => setShowAddProduct(true)}
                      className="bg-primary-container text-primary-container-foreground px-6 py-3 rounded-full font-headline font-bold text-sm flex items-center gap-2 hover:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      Nouveau Produit
                    </button>
                  </div>

                  {products.length === 0 ? (
                    <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
                      <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">inventory_2</span>
                      <p className="font-headline font-bold text-lg mb-2">Aucun produit</p>
                      <p className="text-on-surface-variant text-sm">Ajoutez votre premier produit pour commencer à vendre.</p>
                    </div>
                  ) : (
                    <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Produit</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Quantité</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Prix</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map(p => {
                            const status = getProductStatus(p);
                            return (
                              <tr key={p.id} className="border-t border-border/10">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    {p.image_url ? (
                                      <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
                                        <span className="material-symbols-outlined text-on-surface-variant text-lg">eco</span>
                                      </div>
                                    )}
                                    <span className="font-bold text-sm">{p.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-on-surface-variant">{p.stock} {p.unit}</td>
                                <td className="px-6 py-4 text-sm font-bold">{formatPrice(p.price)}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.cls}`}>{status.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recent Sales */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-extrabold">Dernières Ventes</h3>
                  </div>

                  {orders.length === 0 ? (
                    <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
                      <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">receipt_long</span>
                      <p className="font-headline font-bold text-lg">Aucune vente</p>
                      <p className="text-on-surface-variant text-sm mt-1">Vos ventes apparaîtront ici.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map(o => (
                        <div key={o.id} className="bg-surface-container-lowest rounded-3xl p-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-xs font-extrabold text-primary">
                              {(o.products?.name || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-sm">{o.products?.name || "Produit"}</div>
                              <div className="text-xs text-on-surface-variant">{o.quantity}x · {formatPrice(o.unit_price)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-extrabold text-sm text-primary">{formatPrice(o.unit_price * o.quantity)}</div>
                            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                              {new Date(o.created_at).toLocaleDateString("fr-FR")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SellerDashboard;
