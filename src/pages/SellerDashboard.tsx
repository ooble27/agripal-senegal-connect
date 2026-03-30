import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

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

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-on-surface-variant font-headline font-bold">Chargement...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-background font-headline flex flex-col p-6 gap-6 z-50 border-r border-border/30">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-primary tracking-tight">{shop?.name || "Agrumen"}</span>
          <span className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">Espace Vendeur</span>
        </div>
        <nav className="flex flex-col gap-2 flex-grow">
          <button className="flex items-center gap-3 px-4 py-3 text-primary-container-foreground font-bold bg-primary-container rounded-xl">
            <span className="material-symbols-outlined">dashboard</span>
            Vue d'ensemble
          </button>
        </nav>
        <button onClick={signOut} className="flex items-center gap-3 px-4 py-3 text-destructive font-bold hover:bg-destructive/10 rounded-xl transition-colors">
          <span className="material-symbols-outlined">logout</span>
          Déconnexion
        </button>
      </aside>

      {/* Main */}
      <main className="ml-64 pt-8 px-12 pb-12 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Bonjour, {profile?.full_name || "Vendeur"}</h1>
            <p className="text-on-surface-variant">{shop ? `${shop.location}, ${shop.city}` : "Créez votre boutique pour commencer"}</p>
          </div>
          {shop && (
            <button
              onClick={() => setShowAddProduct(true)}
              className="bg-primary-container text-primary-container-foreground px-6 py-3 rounded-full font-headline font-bold flex items-center gap-2 hover:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined">add</span>
              Ajouter un produit
            </button>
          )}
        </div>

        {/* Create Shop Modal */}
        {showCreateShop && (
          <div className="fixed inset-0 bg-foreground/50 z-[100] flex items-center justify-center p-6">
            <div className="bg-card rounded-xl p-8 max-w-lg w-full shadow-2xl">
              <h2 className="text-2xl font-headline font-extrabold mb-6">Créer votre boutique</h2>
              <form onSubmit={handleCreateShop} className="space-y-4">
                <input value={shopName} onChange={e => setShopName(e.target.value)} required placeholder="Nom de la boutique" className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container" />
                <textarea value={shopDesc} onChange={e => setShopDesc(e.target.value)} placeholder="Description" className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container" rows={3} />
                <div className="grid grid-cols-2 gap-4">
                  <input value={shopLocation} onChange={e => setShopLocation(e.target.value)} placeholder="Localisation (ex: Sangalkam)" className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container" />
                  <input value={shopCity} onChange={e => setShopCity(e.target.value)} placeholder="Ville (ex: Thiès)" className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container" />
                </div>
                <input value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="Téléphone (77 000 00 00)" type="tel" className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container" />
                <button type="submit" className="w-full bg-primary-container text-primary-container-foreground py-4 rounded-full font-headline font-extrabold hover:scale-[0.97] transition-transform">
                  Créer ma boutique
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {showAddProduct && (
          <div className="fixed inset-0 bg-foreground/50 z-[100] flex items-center justify-center p-6">
            <div className="bg-card rounded-xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-headline font-extrabold">Ajouter un produit</h2>
                <button onClick={() => setShowAddProduct(false)} className="text-on-surface-variant hover:text-foreground">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <input value={prodName} onChange={e => setProdName(e.target.value)} required placeholder="Nom du produit" className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container" />
                <textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="Description du produit" className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container" rows={3} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Prix (FCFA)</label>
                    <input value={prodPrice} onChange={e => setProdPrice(e.target.value)} required type="number" min="1" placeholder="1250" className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Unité</label>
                    <select value={prodUnit} onChange={e => setProdUnit(e.target.value)} className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container">
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
                    <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Stock</label>
                    <input value={prodStock} onChange={e => setProdStock(e.target.value)} type="number" min="0" placeholder="100" className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Catégorie</label>
                    <select value={prodCategory} onChange={e => setProdCategory(e.target.value)} className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container">
                      <option value="">Sélectionner</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Photo du produit</label>
                  <input type="file" accept="image/*" onChange={e => setProdImage(e.target.files?.[0] || null)} className="w-full bg-surface-container-low rounded-lg p-3 text-sm" />
                </div>
                <button type="submit" className="w-full bg-primary-container text-primary-container-foreground py-4 rounded-full font-headline font-extrabold hover:scale-[0.97] transition-transform">
                  Publier le produit
                </button>
              </form>
            </div>
          </div>
        )}

        {shop && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-primary-container p-8 rounded-xl">
                <div className="text-xs font-bold text-primary-container-foreground/60 uppercase mb-2">Produits en ligne</div>
                <div className="text-3xl font-black text-primary-container-foreground">{products.filter(p => p.is_active).length}</div>
              </div>
              <div className="bg-card p-8 rounded-xl border border-border/30">
                <div className="text-xs font-bold text-on-surface-variant uppercase mb-2">Commandes reçues</div>
                <div className="text-3xl font-black">{orders.length}</div>
              </div>
              <div className="bg-card p-8 rounded-xl border border-border/30">
                <div className="text-xs font-bold text-on-surface-variant uppercase mb-2">Revenus totaux</div>
                <div className="text-3xl font-black text-primary">{formatPrice(orders.reduce((s, o) => s + o.unit_price * o.quantity, 0))}</div>
              </div>
            </div>

            {/* Products List */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-6">Mes Produits</h2>
              {products.length === 0 ? (
                <div className="bg-surface-container-low rounded-xl p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">inventory_2</span>
                  <p className="font-headline font-bold text-lg mb-2">Aucun produit</p>
                  <p className="text-on-surface-variant text-sm">Ajoutez votre premier produit pour commencer à vendre.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(p => (
                    <div key={p.id} className="bg-card rounded-xl overflow-hidden border border-border/30">
                      {p.image_url && (
                        <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-5">
                        <h3 className="font-headline font-bold text-lg">{p.name}</h3>
                        <p className="text-on-surface-variant text-sm mt-1 line-clamp-2">{p.description}</p>
                        <div className="flex justify-between items-end mt-4">
                          <div>
                            <div className="text-xs text-on-surface-variant">{p.unit}</div>
                            <div className="text-xl font-headline font-extrabold">{formatPrice(p.price)}</div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${p.stock > 10 ? "bg-primary-container/20 text-primary" : p.stock > 0 ? "bg-tertiary/20 text-tertiary-foreground" : "bg-destructive/10 text-destructive"}`}>
                            {p.stock > 0 ? `${p.stock} en stock` : "Épuisé"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Orders */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Commandes récentes</h2>
              {orders.length === 0 ? (
                <div className="bg-surface-container-low rounded-xl p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">receipt_long</span>
                  <p className="font-headline font-bold text-lg">Aucune commande pour le moment</p>
                </div>
              ) : (
                <div className="bg-card rounded-xl border border-border/30 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Produit</th>
                        <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Quantité</th>
                        <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td className="px-6 py-4 font-bold">{o.products?.name || "—"}</td>
                          <td className="px-6 py-4">{o.quantity}</td>
                          <td className="px-6 py-4 font-bold text-primary">{formatPrice(o.unit_price * o.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default SellerDashboard;
