import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import waveLogo from "@/assets/wave-logo.png";
import orangeMoneyLogo from "@/assets/orange-money-logo.png";

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Tables<"categories">[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("overview");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const [prodImages, setProdImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string; image_url: string }[]>([]);

  // Settings form
  const [settingsName, setSettingsName] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsLocation, setSettingsLocation] = useState("");
  const [settingsCity, setSettingsCity] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsFullName, setSettingsFullName] = useState("");
  const [settingsUserPhone, setSettingsUserPhone] = useState("");

  useEffect(() => {
    if (role !== "seller") {
      navigate("/");
      return;
    }
    loadData();
  }, [user, role]);

  // Populate settings form when shop/profile loaded
  useEffect(() => {
    if (shop) {
      setSettingsName(shop.name);
      setSettingsDesc(shop.description || "");
      setSettingsLocation(shop.location || "");
      setSettingsCity(shop.city || "");
      setSettingsPhone(shop.phone || "");
    }
  }, [shop]);

  useEffect(() => {
    if (profile) {
      setSettingsFullName(profile.full_name);
      setSettingsUserPhone(profile.phone || "");
    }
  }, [profile]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

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
        supabase.from("order_items").select("*, products(name, image_url)").eq("shop_id", shopData.id).order("created_at", { ascending: false }).limit(50),
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
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
    setAvatarUrl(urlData.publicUrl);
    toast.success("Photo de profil mise à jour !");
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { data, error } = await supabase.from("shops").insert({
      seller_id: user.id, name: shopName, description: shopDesc,
      location: shopLocation, city: shopCity, phone: shopPhone,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setShop(data);
    setShowCreateShop(false);
    toast.success("Boutique créée !");
  };

  const openEditProduct = async (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDesc(p.description || "");
    setProdPrice(String(p.price));
    setProdUnit(p.unit);
    setProdStock(String(p.stock));
    setProdCategory(p.category_id || "");
    setProdImages([]);
    // Load existing images
    const { data: imgs } = await supabase
      .from("product_images")
      .select("id, image_url")
      .eq("product_id", p.id)
      .order("display_order");
    setExistingImages(imgs || []);
    setShowAddProduct(true);
  };

  const resetProductForm = () => {
    setProdName(""); setProdDesc(""); setProdPrice(""); setProdStock(""); setProdCategory("");
    setProdImages([]); setEditingProduct(null); setExistingImages([]);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    // Upload new images
    const uploadedUrls: string[] = [];
    for (const file of prodImages) {
      const ext = file.name.split(".").pop();
      const path = `${shop.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, file);
      if (uploadErr) { toast.error("Erreur upload image"); return; }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      uploadedUrls.push(urlData.publicUrl);
    }

    // Main image_url = first existing or first uploaded
    const mainImage = existingImages.length > 0
      ? existingImages[0].image_url
      : uploadedUrls.length > 0
        ? uploadedUrls[0]
        : editingProduct?.image_url || null;

    if (editingProduct) {
      const { error } = await supabase.from("products").update({
        name: prodName, description: prodDesc, price: parseInt(prodPrice),
        unit: prodUnit, stock: parseInt(prodStock) || 0, category_id: prodCategory || null, image_url: mainImage,
      }).eq("id", editingProduct.id);
      if (error) { toast.error(error.message); return; }

      // Insert new images to product_images
      if (uploadedUrls.length > 0) {
        const startOrder = existingImages.length;
        const newImgRows = uploadedUrls.map((url, i) => ({
          product_id: editingProduct.id,
          image_url: url,
          display_order: startOrder + i,
        }));
        await supabase.from("product_images").insert(newImgRows);
      }
      toast.success("Produit mis à jour !");
    } else {
      const { data: newProd, error } = await supabase.from("products").insert({
        shop_id: shop.id, name: prodName, description: prodDesc, price: parseInt(prodPrice),
        unit: prodUnit, stock: parseInt(prodStock) || 0, category_id: prodCategory || null, image_url: mainImage,
      }).select().single();
      if (error) { toast.error(error.message); return; }

      // Insert all images to product_images
      if (uploadedUrls.length > 0 && newProd) {
        const imgRows = uploadedUrls.map((url, i) => ({
          product_id: newProd.id,
          image_url: url,
          display_order: i,
        }));
        await supabase.from("product_images").insert(imgRows);
      }
      toast.success("Produit ajouté !");
    }
    setShowAddProduct(false);
    resetProductForm();
    loadData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Produit supprimé");
    loadData();
  };

  const handleToggleProduct = async (p: Product) => {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(p.is_active ? "Produit désactivé" : "Produit activé");
    loadData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !user) return;
    const [{ error: shopErr }, { error: profErr }] = await Promise.all([
      supabase.from("shops").update({
        name: settingsName, description: settingsDesc, location: settingsLocation,
        city: settingsCity, phone: settingsPhone,
      }).eq("id", shop.id),
      supabase.from("profiles").update({
        full_name: settingsFullName, phone: settingsUserPhone,
      }).eq("user_id", user.id),
    ]);
    if (shopErr || profErr) { toast.error("Erreur lors de la sauvegarde"); return; }
    toast.success("Paramètres mis à jour !");
    loadData();
  };

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";
  const totalRevenue = orders.reduce((s, o) => s + o.unit_price * o.quantity, 0);

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
    if (!p.is_active) return { label: "Désactivé", cls: "bg-surface-container text-on-surface-variant" };
    if (p.stock === 0) return { label: "Épuisé", cls: "bg-destructive/10 text-destructive" };
    if (p.stock <= 10) return { label: "Stock faible", cls: "bg-tertiary/20 text-tertiary-foreground" };
    return { label: "En vente", cls: "bg-primary-container/20 text-primary" };
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
    </div>
  );

  // ====== SECTION RENDERERS ======

  const renderOverview = () => (
    <>
      <div className="mb-10 mt-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Bonjour, {profile?.full_name || "Vendeur"}</h1>
        <p className="text-on-surface-variant mt-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">storefront</span>
          {shop?.name}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-10">
        <div className="bg-primary-container p-5 md:p-7 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary-container-foreground/60 text-xl">account_balance</span>
            <span className="text-[9px] md:text-[10px] font-extrabold text-primary-container-foreground/60 uppercase tracking-[0.15em]">Solde</span>
          </div>
          <div className="text-xl md:text-3xl font-black text-primary-container-foreground">{formatPrice(totalRevenue)}</div>
        </div>
        <div className="bg-surface-container-lowest p-5 md:p-7 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">trending_up</span>
            <span className="text-[9px] md:text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Ventes</span>
          </div>
          <div className="text-xl md:text-3xl font-black text-foreground">{formatPrice(totalRevenue)}</div>
        </div>
        <div className="bg-surface-container-lowest p-5 md:p-7 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">shopping_cart</span>
            <span className="text-[9px] md:text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Commandes</span>
          </div>
          <div className="text-xl md:text-3xl font-black text-foreground">{orders.length}</div>
        </div>
        <div className="bg-surface-container-lowest p-5 md:p-7 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">inventory_2</span>
            <span className="text-[9px] md:text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Produits</span>
          </div>
          <div className="text-xl md:text-3xl font-black text-foreground">{products.filter(p => p.is_active).length}</div>
        </div>
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 md:p-8 rounded-3xl">
          <h3 className="text-xl font-extrabold mb-6">Aperçu des ventes</h3>
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
          <button onClick={() => { resetProductForm(); setShowAddProduct(true); }} className="w-full flex items-center gap-4 bg-surface-container-lowest p-5 rounded-3xl hover:bg-surface-container-low transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary-container-foreground">add</span>
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">Ajouter un produit</div>
              <div className="text-xs text-on-surface-variant">Publier un nouveau produit</div>
            </div>
          </button>
          <button onClick={() => setActiveNav("payments")} className="w-full flex items-center gap-4 bg-surface-container-lowest p-5 rounded-3xl hover:bg-surface-container-low transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant">account_balance</span>
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">Voir les paiements</div>
              <div className="text-xs text-on-surface-variant">Wave / Orange Money</div>
            </div>
          </button>
          <button onClick={() => avatarInputRef.current?.click()} className="w-full flex items-center gap-4 bg-surface-container-lowest p-5 rounded-3xl hover:bg-surface-container-low transition-colors">
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

      {/* Recent sales */}
      <div>
        <h3 className="text-xl font-extrabold mb-6">Dernières Ventes</h3>
        {orders.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">receipt_long</span>
            <p className="font-headline font-bold text-lg">Aucune vente</p>
            <p className="text-on-surface-variant text-sm mt-1">Vos ventes apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {orders.slice(0, 6).map(o => (
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
                  <div className="text-[10px] text-on-surface-variant">{new Date(o.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderProducts = () => (
    <>
      <div className="flex items-center justify-between mb-8 mt-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mes Produits</h1>
          <p className="text-on-surface-variant text-sm mt-1">{products.length} produit(s) au total</p>
        </div>
        <button
          onClick={() => { resetProductForm(); setShowAddProduct(true); }}
          className="bg-primary-container text-primary-container-foreground px-5 md:px-6 py-3 rounded-full font-headline font-bold text-sm flex items-center gap-2 hover:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span className="hidden sm:inline">Nouveau Produit</span>
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">inventory_2</span>
          <p className="font-headline font-bold text-lg mb-2">Aucun produit</p>
          <p className="text-on-surface-variant text-sm">Ajoutez votre premier produit pour commencer à vendre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => {
            const status = getProductStatus(p);
            return (
              <div key={p.id} className="bg-surface-container-lowest rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant text-2xl">eco</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{p.name}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">{p.stock} {p.unit} · {formatPrice(p.price)}</div>
                    <span className={`inline-block mt-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${status.cls}`}>{status.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggleProduct(p)} className="p-2 rounded-full hover:bg-surface-container" title={p.is_active ? "Désactiver" : "Activer"}>
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">{p.is_active ? "visibility_off" : "visibility"}</span>
                  </button>
                  <button onClick={() => openEditProduct(p)} className="p-2 rounded-full hover:bg-surface-container" title="Modifier">
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">edit</span>
                  </button>
                  <button onClick={() => handleDeleteProduct(p.id)} className="p-2 rounded-full hover:bg-destructive/10" title="Supprimer">
                    <span className="material-symbols-outlined text-destructive text-lg">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const renderSales = () => (
    <>
      <div className="mb-8 mt-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Ventes</h1>
        <p className="text-on-surface-variant text-sm mt-1">{orders.length} article(s) vendu(s)</p>
      </div>

      {/* Sales chart */}
      <div className="bg-surface-container-lowest p-6 md:p-8 rounded-3xl mb-8">
        <h3 className="text-lg font-extrabold mb-4">Évolution des ventes</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--on-surface-variant))" }} />
              <YAxis hide />
              <Tooltip formatter={(value: number) => formatPrice(value)} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-on-surface-variant text-sm">
            Aucune donnée de vente pour le moment
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-primary-container p-6 rounded-3xl">
          <div className="text-[10px] font-extrabold text-primary-container-foreground/60 uppercase tracking-[0.15em] mb-2">Total ventes</div>
          <div className="text-2xl font-black text-primary-container-foreground">{formatPrice(totalRevenue)}</div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-3xl">
          <div className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em] mb-2">Articles vendus</div>
          <div className="text-2xl font-black text-foreground">{orders.reduce((s, o) => s + o.quantity, 0)}</div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-3xl">
          <div className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em] mb-2">Panier moyen</div>
          <div className="text-2xl font-black text-foreground">
            {orders.length > 0 ? formatPrice(Math.round(totalRevenue / orders.length)) : "—"}
          </div>
        </div>
      </div>

      {/* All orders */}
      <h3 className="text-lg font-extrabold mb-4">Toutes les ventes</h3>
      {orders.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">receipt_long</span>
          <p className="font-bold text-lg">Aucune vente</p>
          <p className="text-on-surface-variant text-sm mt-1">Vos ventes apparaîtront ici.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Produit</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Qté</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Prix unitaire</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Total</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em]">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-t border-border/10">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {o.products?.image_url ? (
                          <img src={o.products.image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface-variant text-sm">eco</span>
                          </div>
                        )}
                        <span className="font-bold text-sm">{o.products?.name || "Produit"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{o.quantity}</td>
                    <td className="px-6 py-4 text-sm">{formatPrice(o.unit_price)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">{formatPrice(o.unit_price * o.quantity)}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );

  const renderPayments = () => (
    <>
      <div className="mb-8 mt-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Paiements</h1>
        <p className="text-on-surface-variant text-sm mt-1">Gérez vos revenus et virements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        <div className="bg-primary-container p-8 rounded-3xl">
          <div className="text-[10px] font-extrabold text-primary-container-foreground/60 uppercase tracking-[0.15em] mb-3">Solde disponible</div>
          <div className="text-4xl font-black text-primary-container-foreground mb-4">{formatPrice(totalRevenue)}</div>
          <p className="text-xs text-primary-container-foreground/70">Montant total de vos ventes cumulées</p>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-3xl">
          <div className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-[0.15em] mb-3">Méthodes de retrait</div>
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low">
              <img src={waveLogo} alt="Wave" className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <div className="font-bold text-sm">Wave</div>
                <div className="text-xs text-on-surface-variant">Virement instantané</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low">
              <img src={orangeMoneyLogo} alt="Orange Money" className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <div className="font-bold text-sm">Orange Money</div>
                <div className="text-xs text-on-surface-variant">Virement mobile</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4">account_balance_wallet</span>
        <h3 className="font-headline font-bold text-lg mb-2">Historique des virements</h3>
        <p className="text-on-surface-variant text-sm max-w-md mx-auto">
          L'historique de vos virements apparaîtra ici une fois que vous aurez effectué votre premier retrait.
        </p>
      </div>
    </>
  );

  const renderSettings = () => (
    <>
      <div className="mb-8 mt-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Paramètres</h1>
        <p className="text-on-surface-variant text-sm mt-1">Gérez votre profil et vos informations</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8 max-w-2xl">
        {/* Profile section */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8">
          <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">person</span>
            Mon Profil
          </h3>
          <div className="flex items-center gap-5 mb-6">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center group shrink-0"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant text-3xl">person</span>
              )}
              <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-surface">photo_camera</span>
              </div>
            </button>
            <div>
              <div className="font-bold">{profile?.full_name || "Vendeur"}</div>
              <div className="text-xs text-on-surface-variant">Cliquez sur la photo pour la changer</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Nom complet</label>
              <input value={settingsFullName} onChange={e => setSettingsFullName(e.target.value)} className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Téléphone</label>
              <input value={settingsUserPhone} onChange={e => setSettingsUserPhone(e.target.value)} type="tel" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
            </div>
          </div>
        </div>

        {/* Shop section */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">storefront</span>
              Ma Boutique
            </h3>
            {shop && (
              <a
                href={`/boutique/${shop.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Voir ma boutique <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            )}
          </div>

          {/* Logo upload */}
          <div className="flex items-center gap-5 mb-6">
            <button
              type="button"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async (ev) => {
                  const file = (ev.target as HTMLInputElement).files?.[0];
                  if (!file || !shop) return;
                  const path = `${shop.id}/logo.${file.name.split('.').pop()}`;
                  const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
                  if (upErr) { toast.error("Erreur upload logo"); return; }
                  const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
                  await supabase.from("shops").update({ logo_url: publicUrl }).eq("id", shop.id);
                  setShop({ ...shop, logo_url: publicUrl });
                  toast.success("Logo mis à jour !");
                };
                input.click();
              }}
              className="relative w-20 h-20 rounded-2xl overflow-hidden bg-surface-container-high flex items-center justify-center group shrink-0 border-2 border-dashed border-border"
            >
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant text-3xl">add_photo_alternate</span>
              )}
              <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-surface">photo_camera</span>
              </div>
            </button>
            <div>
              <div className="font-bold text-sm">{shop?.logo_url ? "Logo de la boutique" : "Ajouter un logo"}</div>
              <div className="text-xs text-on-surface-variant">Ce logo apparaît sur votre page boutique publique</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Nom de la boutique</label>
              <input value={settingsName} onChange={e => setSettingsName(e.target.value)} className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Description</label>
              <textarea value={settingsDesc} onChange={e => setSettingsDesc(e.target.value)} rows={3} className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" placeholder="Décrivez votre boutique, vos produits, votre philosophie..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Localisation</label>
                <input value={settingsLocation} onChange={e => setSettingsLocation(e.target.value)} className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" placeholder="Ex: Sangalkam, Niayes" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Ville</label>
                <input value={settingsCity} onChange={e => setSettingsCity(e.target.value)} className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" placeholder="Ex: Dakar, Thiès" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Téléphone boutique</label>
              <input value={settingsPhone} onChange={e => setSettingsPhone(e.target.value)} type="tel" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
            </div>
          </div>
        </div>

        <button type="submit" className="bg-primary-container text-primary-container-foreground px-8 py-4 rounded-full font-headline font-extrabold text-base hover:scale-[0.97] transition-transform">
          Sauvegarder les modifications
        </button>
      </form>
    </>
  );

  const renderContent = () => {
    switch (activeNav) {
      case "products": return renderProducts();
      case "sales": return renderSales();
      case "payments": return renderPayments();
      case "settings": return renderSettings();
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-background font-body flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`h-screen w-72 fixed left-0 top-0 bg-background font-headline flex flex-col p-8 gap-8 z-50 border-r border-border/30 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)" }}>
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
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl px-5 md:px-10 py-4 md:py-5 flex items-center justify-between border-b border-border/20 safe-area-top">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-full hover:bg-surface-container">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <h3 className="text-lg font-headline font-bold text-on-surface-variant">
              {navItems.find(n => n.id === activeNav)?.label || "Tableau de Bord"}
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Solde</div>
              <div className="text-base font-headline font-extrabold text-primary">{formatPrice(totalRevenue)}</div>
            </div>
            <button className="relative p-2">
              <span className="material-symbols-outlined text-on-surface-variant text-2xl">notifications</span>
            </button>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center group"
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
              onChange={e => { const file = e.target.files?.[0]; if (file) handleAvatarUpload(file); }}
            />
          </div>
        </header>

        <div className="px-5 md:px-10 pb-12">
          {/* Create Shop Modal */}
          {showCreateShop && (
            <div className="fixed inset-0 bg-foreground/50 z-[100] flex items-center justify-center p-6">
              <div className="bg-card rounded-3xl p-8 md:p-10 max-w-lg w-full shadow-2xl">
                <h2 className="text-2xl font-headline font-extrabold mb-2">Créer votre boutique</h2>
                <p className="text-on-surface-variant text-sm mb-8">Remplissez les informations de votre boutique pour commencer à vendre.</p>
                <form onSubmit={handleCreateShop} className="space-y-4">
                  <input value={shopName} onChange={e => setShopName(e.target.value)} required placeholder="Nom de la boutique" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  <textarea value={shopDesc} onChange={e => setShopDesc(e.target.value)} placeholder="Description" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" rows={3} />
                  <div className="grid grid-cols-2 gap-4">
                    <input value={shopLocation} onChange={e => setShopLocation(e.target.value)} placeholder="Localisation" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                    <input value={shopCity} onChange={e => setShopCity(e.target.value)} placeholder="Ville" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  </div>
                  <input value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="Téléphone" type="tel" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  <button type="submit" className="w-full bg-primary-container text-primary-container-foreground py-4 rounded-full font-headline font-extrabold text-base hover:scale-[0.97] transition-transform mt-4">
                    Créer ma boutique
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Add/Edit Product Modal */}
          {showAddProduct && (
            <div className="fixed inset-0 bg-foreground/50 z-[100] flex items-center justify-center p-6">
              <div className="bg-card rounded-3xl p-8 md:p-10 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-headline font-extrabold">{editingProduct ? "Modifier le Produit" : "Nouveau Produit"}</h2>
                    <p className="text-on-surface-variant text-sm">{editingProduct ? "Modifiez les informations du produit." : "Publiez un nouveau produit sur le marché."}</p>
                  </div>
                  <button onClick={() => { setShowAddProduct(false); resetProductForm(); }} className="text-on-surface-variant hover:text-foreground p-2 rounded-full hover:bg-surface-container-low">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <input value={prodName} onChange={e => setProdName(e.target.value)} required placeholder="Nom du produit" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  <textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="Description" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" rows={3} />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Prix (FCFA)</label>
                      <input value={prodPrice} onChange={e => setProdPrice(e.target.value)} required type="number" min="1" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Unité</label>
                      <select value={prodUnit} onChange={e => setProdUnit(e.target.value)} className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm">
                        <option>le kg</option><option>la caisse</option><option>le lot</option><option>la pièce</option><option>250g</option><option>500g</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Stock</label>
                      <input value={prodStock} onChange={e => setProdStock(e.target.value)} type="number" min="0" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
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
                    <label className="text-xs font-bold text-on-surface-variant mb-1.5 block uppercase tracking-wider">Photos du produit (jusqu'à 4)</label>
                    {/* Existing images */}
                    {existingImages.length > 0 && (
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {existingImages.map((img) => (
                          <div key={img.id} className="relative group">
                            <img src={img.image_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                            <button
                              type="button"
                              onClick={async () => {
                                await supabase.from("product_images").delete().eq("id", img.id);
                                setExistingImages(prev => prev.filter(i => i.id !== img.id));
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* New images preview */}
                    {prodImages.length > 0 && (
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {prodImages.map((file, i) => (
                          <div key={i} className="relative group">
                            <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 rounded-xl object-cover" />
                            <button
                              type="button"
                              onClick={() => setProdImages(prev => prev.filter((_, j) => j !== i))}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        const maxNew = 4 - existingImages.length - prodImages.length;
                        setProdImages(prev => [...prev, ...files.slice(0, Math.max(0, maxNew))]);
                        e.target.value = "";
                      }}
                      className="w-full bg-surface-container-low rounded-2xl p-4 text-sm"
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      {existingImages.length + prodImages.length}/4 photos
                    </p>
                  </div>
                  <button type="submit" className="w-full bg-primary-container text-primary-container-foreground py-4 rounded-full font-headline font-extrabold text-base hover:scale-[0.97] transition-transform mt-4">
                    {editingProduct ? "Enregistrer" : "Publier le produit"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {shop && renderContent()}
        </div>
      </main>
    </div>
  );
};

export default SellerDashboard;
