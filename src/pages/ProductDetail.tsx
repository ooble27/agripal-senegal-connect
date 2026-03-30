import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products"> & {
  shops: {
    name: string;
    location: string | null;
    seller_id: string;
    description: string | null;
    logo_url: string | null;
    city: string | null;
    phone: string | null;
  } | null;
};

type SellerProfile = {
  full_name: string;
  avatar_url: string | null;
  city: string | null;
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("products")
      .select("*, shops(name, location, seller_id, description, logo_url, city, phone)")
      .eq("id", id)
      .single()
      .then(async ({ data }) => {
        if (data) {
          const product = data as Product;
          setProduct(product);

          // Load seller profile for avatar
          if (product.shops?.seller_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, city")
              .eq("user_id", product.shops.seller_id)
              .single();
            if (profile) setSellerProfile(profile);
          }

          // Load related products from same shop
          supabase
            .from("products")
            .select("*, shops(name, location, seller_id, description, logo_url, city, phone)")
            .eq("shop_id", data.shop_id)
            .neq("id", data.id)
            .eq("is_active", true)
            .limit(3)
            .then(({ data: rel }) => {
              if (rel) setRelated(rel as Product[]);
            });
        }
        setLoading(false);
      });
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

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-24 px-6 md:px-12 max-w-[1440px] mx-auto text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-6">search_off</span>
          <h1 className="text-4xl font-headline font-extrabold mb-4">Produit introuvable</h1>
          <p className="text-on-surface-variant mb-8">Ce produit n'existe pas ou a été retiré.</p>
          <Link to="/" className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-full font-headline font-extrabold hover:scale-95 transition-transform">
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
      <main className="pt-24">
        {/* Breadcrumb */}
        <div className="px-6 md:px-12 max-w-[1440px] mx-auto py-6">
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant font-body">
            <Link to="/" className="hover:text-primary transition-colors">Marché</Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <span className="text-foreground font-medium">{product.name}</span>
          </nav>
        </div>

        {/* Product Hero */}
        <section className="px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative rounded-xl overflow-hidden aspect-square bg-surface-container"
            >
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-8xl text-on-surface-variant/20">eco</span>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col"
            >
              <h1 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tighter mb-4">{product.name}</h1>

              {product.description && (
                <p className="text-lg text-on-surface-variant font-body leading-relaxed mb-8">{product.description}</p>
              )}

              <div className="flex items-end gap-4 mb-8">
                <div>
                  <div className="text-sm text-on-surface-variant">{product.unit}</div>
                  <div className="text-4xl font-headline font-extrabold">{formatPrice(product.price)}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${product.stock > 0 ? "bg-primary-container/20 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {product.stock > 0 ? `${product.stock} en stock` : "Épuisé"}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-12">
                <button
                  onClick={() => addItem({
                    id: product.id,
                    name: product.name,
                    price: formatPrice(product.price),
                    priceNum: product.price,
                    unit: product.unit,
                    image: product.image_url || "/placeholder.svg",
                    farmer: product.shops?.name || "Vendeur",
                    shopId: product.shop_id,
                  })}
                  disabled={product.stock <= 0}
                  className="flex-1 min-w-[200px] bg-primary-container text-primary-container-foreground px-8 py-5 rounded-full font-headline font-extrabold text-lg flex items-center justify-center gap-3 hover:scale-[0.97] transition-transform shadow-xl disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">add_shopping_cart</span>
                  Ajouter au Panier
                </button>
              </div>

              {/* Seller Card */}
              {product.shops && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-border/30">
                  <div className="flex items-center gap-4 mb-4">
                    {sellerProfile?.avatar_url ? (
                      <img
                        src={sellerProfile.avatar_url}
                        alt={sellerProfile.full_name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary-container-foreground text-xl">person</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-headline font-extrabold text-lg">{product.shops.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        {product.shops.location && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {product.shops.location}
                          </span>
                        )}
                        {product.shops.city && (
                          <span>• {product.shops.city}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-container/20 rounded-full text-xs font-bold text-primary">
                        <span className="material-symbols-outlined text-sm filled">verified</span>
                        Vérifié
                      </span>
                    </div>
                  </div>
                  {product.shops.description && (
                    <p className="text-sm text-on-surface-variant leading-relaxed">{product.shops.description}</p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
            <h2 className="text-3xl font-headline font-extrabold tracking-tighter mb-8">Du même vendeur</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {related.map(p => (
                <Link to={`/produit/${p.id}`} key={p.id} className="bg-surface-container-lowest rounded-lg overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="h-48 bg-surface-container">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">eco</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-headline font-bold">{p.name}</h3>
                    <div className="text-xl font-headline font-extrabold mt-2">{formatPrice(p.price)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
