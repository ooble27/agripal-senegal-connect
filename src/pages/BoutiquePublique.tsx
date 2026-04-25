import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import type { Tables } from "@/integrations/supabase/types";

type Shop = Tables<"shops">;
type Product = Tables<"products"> & {
  categories: { name: string; icon: string | null } | null;
};
type SellerProfile = {
  full_name: string;
  avatar_url: string | null;
  city: string | null;
};

const BoutiquePublique = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: shopData } = await supabase
        .from("shops")
        .select("*")
        .eq("id", id)
        .single();
      if (!shopData) { setLoading(false); return; }
      setShop(shopData);

      const [{ data: prods }, { data: prof }] = await Promise.all([
        supabase
          .from("products")
          .select("*, categories(name, icon)")
          .eq("shop_id", id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("full_name, avatar_url, city")
          .eq("user_id", shopData.seller_id)
          .single(),
      ]);

      if (prods) setProducts(prods as Product[]);
      if (prof) setSeller(prof);
      setLoading(false);
    };
    load();
  }, [id]);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR");

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: formatPrice(product.price) + " FCFA",
      priceNum: product.price,
      unit: product.unit,
      image: product.image_url || "/placeholder.svg",
      farmer: shop?.name || "Vendeur",
      shopId: product.shop_id,
    });
  };

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
        <main className="pt-32 pb-24 px-6 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-6">storefront</span>
          <h1 className="text-4xl font-headline font-extrabold mb-4">Boutique introuvable</h1>
          <p className="text-on-surface-variant mb-8">Cette boutique n'existe pas ou a été désactivée.</p>
          <Link to="/marche" className="inline-block bg-primary-container text-primary-container-foreground px-8 py-4 rounded-full font-headline font-extrabold hover:scale-95 transition-transform">
            Retour au Marché
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="pt-24 md:pt-24">

        {/* ═══════ HERO BOUTIQUE ═══════ */}
        <section className="px-5 md:px-12 max-w-[1440px] mx-auto mt-4 md:mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-surface-container-lowest rounded-3xl p-6 md:p-10 border border-border/20"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Logo */}
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-surface-container-high flex items-center justify-center shrink-0">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant text-3xl">storefront</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-4xl font-headline font-extrabold tracking-tight">{shop.name}</h1>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {(shop.city || shop.location) && (
                    <span className="flex items-center gap-1 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {[shop.location, shop.city].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm text-primary font-bold">
                    <span className="material-symbols-outlined text-base">inventory_2</span>
                    {products.length} produit{products.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {shop.description && (
                  <p className="text-sm text-on-surface-variant mt-3 leading-relaxed max-w-xl">
                    {shop.description}
                  </p>
                )}
              </div>

              {/* Seller card */}
              {seller && (
                <div className="flex items-center gap-3 shrink-0 bg-surface-container rounded-2xl px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center overflow-hidden">
                    {seller.avatar_url ? (
                      <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-primary text-sm">person</span>
                    )}
                  </div>
                  <div>
                    <p className="font-headline font-extrabold text-sm">{seller.full_name}</p>
                    <p className="text-[10px] text-on-surface-variant">{seller.city || "Sénégal"}</p>
                  </div>
                  {shop.phone && (
                    <a
                      href={`tel:${shop.phone}`}
                      className="ml-2 w-9 h-9 rounded-full bg-primary-container flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-on-primary-container text-sm">call</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* ═══════ PRODUITS ═══════ */}
        <section className="px-5 md:px-12 max-w-[1440px] mx-auto mt-6 md:mt-8 pb-8">
          <h2 className="text-lg md:text-2xl font-headline font-extrabold tracking-tight mb-4">
            Tous les produits
          </h2>

          {products.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">inventory_2</span>
              <p className="font-headline font-bold text-lg mb-2">Aucun produit disponible</p>
              <p className="text-on-surface-variant text-sm">Cette boutique n'a pas encore ajouté de produits.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  formatPrice={formatPrice}
                  index={i}
                />
              ))}
            </div>
          )}
        </section>

        <div className="hidden md:block">
          <Footer />
        </div>
      </main>
    </div>
  );
};

export default BoutiquePublique;
