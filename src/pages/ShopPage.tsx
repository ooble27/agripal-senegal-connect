import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Shop = Tables<"shops">;
type Product = Tables<"products">;
type SellerProfile = { full_name: string; avatar_url: string | null; city: string | null };

const ShopPage = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: shopData } = await supabase.from("shops").select("*").eq("id", id).single();
      if (!shopData) { setLoading(false); return; }
      setShop(shopData);

      const [{ data: prods, count }, { data: prof }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact" }).eq("shop_id", id).eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("profiles").select("full_name, avatar_url, city").eq("user_id", shopData.seller_id).single(),
      ]);
      if (prods) setProducts(prods);
      if (count !== null) setProductCount(count);
      if (prof) setSeller(prof);
      setLoading(false);
    };
    load();
  }, [id]);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
        </main>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-24 px-6 max-w-[1440px] mx-auto text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/40 mb-4">store_mall_directory</span>
          <h1 className="text-3xl font-headline font-extrabold mb-3">Boutique introuvable</h1>
          <p className="text-on-surface-variant mb-6">Cette boutique n'existe pas ou a été désactivée.</p>
          <Link to="/marche" className="inline-block bg-primary-container text-primary-container-foreground px-6 py-3 rounded-full font-bold text-sm hover:scale-95 transition-transform">
            Retour au Marché
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* ═══════ HERO BANNER ═══════ */}
        <section className="relative">
          {/* Background gradient */}
          <div className="h-56 md:h-72 bg-gradient-to-br from-inverse-surface via-inverse-surface to-primary/30" />

          {/* Shop info card overlapping */}
          <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-20 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-3xl p-6 md:p-8 shadow-2xl border border-border/20"
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Logo */}
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-surface-container border-4 border-background overflow-hidden shrink-0 -mt-16 md:-mt-20 shadow-xl">
                  {shop.logo_url ? (
                    <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-container">
                      <span className="material-symbols-outlined text-4xl text-primary-container-foreground">storefront</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                    <h1 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tighter">{shop.name}</h1>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold self-center md:self-auto">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Vérifié
                    </span>
                  </div>
                  {shop.description && (
                    <p className="text-on-surface-variant text-sm md:text-base leading-relaxed mb-4 max-w-2xl">{shop.description}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-on-surface-variant">
                    {shop.city && (
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {shop.city}
                      </span>
                    )}
                    {shop.location && (
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">map</span>
                        {shop.location}
                      </span>
                    )}
                    {shop.phone && (
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">call</span>
                        {shop.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6 md:gap-8 shrink-0">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-headline font-extrabold text-primary">{productCount}</div>
                    <div className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest">Produits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-headline font-extrabold text-primary">100%</div>
                    <div className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest">Bio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-headline font-extrabold text-primary">24h</div>
                    <div className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest">Livraison</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ SELLER CARD ═══════ */}
        {seller && (
          <section className="max-w-6xl mx-auto px-4 md:px-8 mt-8">
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-border/20 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-container border-2 border-primary/20 shrink-0">
                {seller.avatar_url ? (
                  <img src={seller.avatar_url} alt={seller.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant/40">person</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Producteur</div>
                <div className="font-headline font-extrabold text-base truncate">{seller.full_name}</div>
                {seller.city && (
                  <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-xs">location_on</span>
                    {seller.city}
                  </div>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">eco</span>
                <span className="text-xs font-bold text-primary">Agriculture Bio</span>
              </div>
            </div>
          </section>
        )}

        {/* ═══════ PRODUCTS GRID ═══════ */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tighter">Nos Produits</h2>
              <p className="text-sm text-on-surface-variant mt-1">{productCount} produit{productCount > 1 ? "s" : ""} disponible{productCount > 1 ? "s" : ""}</p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/20">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3">inventory_2</span>
              <p className="font-headline font-bold text-base">Aucun produit pour le moment</p>
              <p className="text-on-surface-variant text-sm mt-1">Cette boutique n'a pas encore ajouté de produits.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group bg-card rounded-2xl overflow-hidden border border-border/20 hover:shadow-xl hover:border-primary/20 transition-all duration-300"
                >
                  <Link to={`/produit/${p.id}`} className="block">
                    <div className="aspect-square bg-surface-container overflow-hidden relative">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-on-surface-variant/20">eco</span>
                        </div>
                      )}
                      {p.stock <= 0 && (
                        <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                          <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-bold">Rupture</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 md:p-4">
                      <h3 className="font-headline font-extrabold text-sm md:text-base mb-1 truncate">{p.name}</h3>
                      <div className="text-xs text-on-surface-variant mb-2">{p.unit}</div>
                      <div className="font-headline font-extrabold text-base md:text-lg text-primary">{formatPrice(p.price)}</div>
                    </div>
                  </Link>
                  <div className="px-3 md:px-4 pb-3 md:pb-4">
                    <button
                      onClick={() => addItem({
                        id: p.id,
                        name: p.name,
                        price: formatPrice(p.price),
                        priceNum: p.price,
                        unit: p.unit,
                        image: p.image_url || "/placeholder.svg",
                        farmer: shop.name,
                        shopId: p.shop_id,
                      })}
                      disabled={p.stock <= 0}
                      className="w-full bg-primary-container text-primary-container-foreground py-2.5 rounded-xl font-headline font-bold text-xs flex items-center justify-center gap-1.5 hover:scale-[0.97] transition-transform disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                      Ajouter
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ═══════ TRUST BADGES ═══════ */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: "verified", title: "Qualité Vérifiée", desc: "Produits contrôlés" },
              { icon: "local_shipping", title: "Livraison Rapide", desc: "Sous 24h à Dakar" },
              { icon: "eco", title: "100% Bio", desc: "Sans pesticides" },
              { icon: "handshake", title: "Prix Juste", desc: "Direct producteur" },
            ].map((badge, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-2xl p-4 md:p-5 border border-border/20 text-center">
                <span className="material-symbols-outlined text-2xl text-primary mb-2 inline-block">{badge.icon}</span>
                <div className="font-headline font-extrabold text-xs md:text-sm">{badge.title}</div>
                <div className="text-[10px] md:text-xs text-on-surface-variant mt-0.5">{badge.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ShopPage;
