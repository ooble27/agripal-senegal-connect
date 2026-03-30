import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import shopHeroDefault from "@/assets/shop-hero-default.jpg";
import shopTerroirImg from "@/assets/shop-terroir.jpg";

type Shop = Tables<"shops">;
type Product = Tables<"products">;
type Category = Tables<"categories">;
type SellerProfile = { full_name: string; avatar_url: string | null; city: string | null };

const ShopPage = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: shopData } = await supabase.from("shops").select("*").eq("id", id).single();
      if (!shopData) { setLoading(false); return; }
      setShop(shopData);

      const [{ data: prods }, { data: prof }, { data: cats }] = await Promise.all([
        supabase.from("products").select("*").eq("shop_id", id).eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("profiles").select("full_name, avatar_url, city").eq("user_id", shopData.seller_id).single(),
        supabase.from("categories").select("*"),
      ]);
      if (prods) setProducts(prods);
      if (prof) setSeller(prof);
      if (cats) setCategories(cats);
      setLoading(false);
    };
    load();
  }, [id]);

  const filtered = useMemo(() => {
    let list = products;
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (activeCategory) list = list.filter(p => p.category_id === activeCategory);
    return list;
  }, [products, search, activeCategory]);

  const shopCategories = useMemo(() => {
    const catIds = new Set(products.map(p => p.category_id).filter(Boolean));
    return categories.filter(c => catIds.has(c.id));
  }, [products, categories]);

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
          <Link to="/marche" className="inline-block bg-primary-container text-on-primary-container px-6 py-3 rounded-full font-bold text-sm hover:scale-95 transition-transform">
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
        <section className="relative h-[420px] md:h-[614px] min-h-[350px] w-full overflow-hidden">
          <img
            src={shopHeroDefault}
            alt={`Ferme ${shop.name}`}
            className="absolute inset-0 w-full h-full object-cover"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent" />

          <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 max-w-[1440px] mx-auto flex flex-col md:flex-row items-end justify-between gap-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="relative shrink-0">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="w-24 h-24 md:w-36 md:h-36 rounded-xl object-cover border-4 border-primary-container shadow-2xl" />
                ) : (
                  <div className="w-24 h-24 md:w-36 md:h-36 rounded-xl bg-primary-container border-4 border-primary-container shadow-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl md:text-5xl text-on-primary-container">storefront</span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-primary-container text-on-primary-container px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                  Certifié Bio
                </div>
              </div>
              <div className="text-white">
                <h1 className="font-headline text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter mb-2">{shop.name}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    <span className="material-symbols-outlined text-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="ml-1 text-sm font-bold">4.9 ({products.length} produits)</span>
                  </div>
                  {(shop.city || seller?.city) && (
                    <span className="text-sm font-medium opacity-80 flex items-center">
                      <span className="material-symbols-outlined mr-1 text-sm">location_on</span>
                      {shop.city || seller?.city}, Sénégal
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              {shop.phone && (
                <a href={`tel:${shop.phone}`} className="bg-primary-container text-on-primary-container px-6 md:px-8 py-3 md:py-4 rounded-full font-bold font-headline transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20 text-sm md:text-base">
                  Contacter
                </a>
              )}
              <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 md:px-6 py-3 md:py-4 rounded-full font-bold font-headline hover:bg-white/20 transition-all">
                <span className="material-symbols-outlined">share</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═══════ SEARCH & FILTER BAR ═══════ */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-8 mt-8 md:mt-12">
          <div className="bg-surface-container-lowest p-3 md:p-4 rounded-xl flex flex-col md:flex-row gap-4 md:gap-6 items-center shadow-sm">
            <div className="relative w-full md:flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
              <input
                className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-outline-variant font-body text-sm"
                placeholder="Rechercher dans la boutique..."
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-5 py-2.5 rounded-full font-bold text-xs whitespace-nowrap transition-colors ${!activeCategory ? "bg-primary-container text-on-primary-container" : "bg-secondary-container text-on-secondary-container hover:bg-surface-variant"}`}
              >
                Tous les produits
              </button>
              {shopCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                  className={`px-5 py-2.5 rounded-full font-semibold text-xs whitespace-nowrap transition-colors ${activeCategory === cat.id ? "bg-primary-container text-on-primary-container" : "bg-secondary-container text-on-secondary-container hover:bg-surface-variant"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ PRODUCT GRID ═══════ */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-8 mt-10 md:mt-16">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3">inventory_2</span>
              <p className="font-headline font-bold text-base">Aucun produit trouvé</p>
              <p className="text-on-surface-variant text-sm mt-1">Essayez une autre recherche ou catégorie.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-2"
                >
                  <Link to={`/produit/${p.id}`} className="block">
                    <div className="relative h-40 md:h-64 overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-on-surface-variant/20">eco</span>
                        </div>
                      )}
                      {p.stock <= 0 && (
                        <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                          <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-bold">Rupture</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4 md:p-6 flex flex-col flex-1">
                    <Link to={`/produit/${p.id}`}>
                      <h3 className="font-headline font-extrabold text-sm md:text-xl text-on-surface mb-1 truncate">{p.name}</h3>
                    </Link>
                    <p className="text-xs md:text-sm text-outline mb-3 md:mb-4 line-clamp-2 hidden md:block">{p.description || p.unit}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div>
                        <span className="block text-lg md:text-2xl font-black text-primary">{formatPrice(p.price)}</span>
                        <span className="text-[10px] md:text-xs font-medium text-outline">{p.unit}</span>
                      </div>
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
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-lg md:text-base">add_shopping_cart</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {filtered.length > 0 && filtered.length < products.length && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={() => { setSearch(""); setActiveCategory(null); }}
                className="bg-surface-container-high text-on-surface-variant px-10 py-3.5 rounded-full font-bold text-sm transition-all hover:bg-surface-container-highest"
              >
                Voir tous les {products.length} produits
              </button>
            </div>
          )}
        </section>

        {/* ═══════ TERROIR / ABOUT SECTION ═══════ */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-8 mt-20 md:mt-32">
          <div className="bg-surface-container-low rounded-xl overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-1/2 p-8 md:p-12 lg:p-20">
              <span className="text-primary font-black uppercase tracking-widest text-xs md:text-sm mb-4 block">Notre Terroir</span>
              <h2 className="font-headline text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter text-on-surface mb-6 md:mb-8 leading-tight">
                L'héritage de {shop.name}
                {shop.city && ` à ${shop.city}`}
              </h2>
              <p className="text-sm md:text-lg text-on-surface-variant mb-6 md:mb-8 leading-relaxed font-body">
                {shop.description || `Découvrez notre ferme familiale qui perpétue des techniques de culture ancestrales alliées à une rigueur moderne. Nos produits sont cultivés avec soin pour vous offrir le meilleur du terroir sénégalais.`}
              </p>
              <div className="flex flex-wrap gap-3 mb-8 md:mb-12">
                {[
                  { icon: "verified", label: "Certifié Bio-Sénégal" },
                  { icon: "water_drop", label: "Irrigation Raisonnée" },
                  { icon: "diversity_3", label: "Commerce Équitable" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2 bg-surface-container-lowest px-3 md:px-4 py-2 rounded-full shadow-sm border border-outline-variant/10">
                    <span className="material-symbols-outlined text-primary text-sm">{b.icon}</span>
                    <span className="text-xs md:text-sm font-bold">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 h-64 md:h-80 lg:h-auto relative overflow-hidden">
              <img src={shopTerroirImg} alt="Notre terroir" className="w-full h-full object-cover" loading="lazy" width={1024} height={1024} />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-container-low via-transparent to-transparent hidden lg:block" />
            </div>
          </div>
        </section>

        {/* ═══════ REVIEWS SECTION ═══════ */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-8 mt-20 md:mt-32 mb-16 md:mb-20">
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <div>
              <h2 className="font-headline text-xl md:text-3xl font-black tracking-tight text-on-surface">Ce que disent nos clients</h2>
              <p className="text-outline text-xs md:text-sm mt-1">Des familles nous font confiance chaque semaine.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {[
              { initials: "AM", name: "Aminata M.", review: "Les produits sont d'une fraîcheur incroyable. On sent que c'est du naturel et du bio. La livraison a été impeccable.", time: "Il y a 2 jours", verified: "Cliente vérifiée" },
              { initials: "PD", name: "Papa Diouf", review: "Incroyable fraîcheur. Les légumes sont encore terreux, c'est le signe d'une récolte récente. Un grand merci au producteur !", time: "Il y a 1 semaine", verified: "Client vérifié" },
              { initials: "SK", name: "Seynabou K.", review: "Je commande mon panier hebdomadaire ici depuis 3 mois. Jamais déçu. Les prix sont très corrects pour cette qualité bio.", time: "Il y a 5 jours", verified: "Cliente vérifiée", highlight: true },
            ].map((r, i) => (
              <div key={i} className={`bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-sm ${r.highlight ? "border-2 border-primary-container" : ""}`}>
                <div className="flex items-center gap-1 text-primary-container mb-3 md:mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="material-symbols-outlined text-lg md:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="text-on-surface-variant italic mb-4 md:mb-6 leading-relaxed text-sm md:text-base">"{r.review}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary text-xs md:text-sm">{r.initials}</div>
                  <div>
                    <span className="block font-bold text-xs md:text-sm">{r.name}</span>
                    <span className="text-[10px] md:text-xs text-outline">{r.verified} • {r.time}</span>
                  </div>
                </div>
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
