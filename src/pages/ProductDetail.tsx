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

          if (product.shops?.seller_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, city")
              .eq("user_id", product.shops.seller_id)
              .single();
            if (profile) setSellerProfile(profile);
          }

          supabase
            .from("products")
            .select("*, shops(name, location, seller_id, description, logo_url, city, phone)")
            .eq("shop_id", data.shop_id)
            .neq("id", data.id)
            .eq("is_active", true)
            .limit(4)
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
          <span className="material-symbols-outlined text-4xl text-muted-foreground animate-spin">progress_activity</span>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-24 px-6 md:px-12 max-w-[1440px] mx-auto text-center">
          <span className="material-symbols-outlined text-6xl text-muted-foreground mb-6">search_off</span>
          <h1 className="text-4xl font-headline font-extrabold mb-4">Produit introuvable</h1>
          <p className="text-muted-foreground mb-8">Ce produit n'existe pas ou a été retiré.</p>
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
      <main className="pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="px-6 md:px-12 max-w-[1200px] mx-auto py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground font-body">
            <Link to="/" className="hover:text-primary transition-colors">Marché</Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <span className="text-foreground font-medium">{product.name}</span>
          </nav>
        </div>

        {/* Product Section */}
        <section className="px-6 md:px-12 max-w-[1200px] mx-auto">
          <div className="bg-card rounded-3xl overflow-hidden border border-border/50">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Image */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="aspect-square bg-muted"
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-8xl text-muted-foreground/30">eco</span>
                  </div>
                )}
              </motion.div>

              {/* Details */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="p-8 lg:p-12 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm">eco</span>
                      Produit frais
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.stock > 0 ? "bg-primary/15 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {product.stock > 0 ? `${product.stock} en stock` : "Épuisé"}
                    </span>
                  </div>

                  <h1 className="text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-foreground mb-3">
                    {product.name}
                  </h1>

                  {product.description && (
                    <p className="text-muted-foreground font-body text-base leading-relaxed mb-6">
                      {product.description}
                    </p>
                  )}

                  <div className="mb-8">
                    <span className="text-sm text-muted-foreground block mb-1">{product.unit}</span>
                    <span className="text-4xl font-headline font-extrabold text-foreground">{formatPrice(product.price)}</span>
                  </div>
                </div>

                {/* Add to cart */}
                <div className="space-y-4">
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
                    className="w-full bg-primary text-primary-foreground px-8 py-4 rounded-full font-headline font-extrabold text-lg flex items-center justify-center gap-3 hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">add_shopping_cart</span>
                    Ajouter au Panier
                  </button>

                  {/* Traceability badges */}
                  <div className="flex items-center gap-3 justify-center">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="material-symbols-outlined text-sm text-primary">verified</span>
                      Origine certifiée
                    </span>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="material-symbols-outlined text-sm text-primary">local_shipping</span>
                      Livraison Dakar
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Seller Profile Section */}
        {product.shops && (
          <section className="px-6 md:px-12 max-w-[1200px] mx-auto mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card rounded-3xl border border-border/50 p-8"
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">À propos du producteur</h2>
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="shrink-0">
                  {sellerProfile?.avatar_url ? (
                    <img
                      src={sellerProfile.avatar_url}
                      alt={sellerProfile.full_name}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-primary">person</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-headline font-extrabold text-foreground">{product.shops.name}</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 rounded-full text-xs font-bold text-primary">
                      <span className="material-symbols-outlined text-sm filled">verified</span>
                      Certifié
                    </span>
                  </div>
                  {sellerProfile?.full_name && (
                    <p className="text-sm text-muted-foreground mb-1">
                      Géré par <span className="font-semibold text-foreground">{sellerProfile.full_name}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    {product.shops.location && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {product.shops.location}
                      </span>
                    )}
                    {product.shops.city && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">apartment</span>
                        {product.shops.city}
                      </span>
                    )}
                    {product.shops.phone && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">call</span>
                        {product.shops.phone}
                      </span>
                    )}
                  </div>
                  {product.shops.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{product.shops.description}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </section>
        )}

        {/* Related Products */}
        {related.length > 0 && (
          <section className="px-6 md:px-12 max-w-[1200px] mx-auto mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-headline font-extrabold tracking-tight text-foreground">Autres produits du même vendeur</h2>
              <Link to="/" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                Tout le Marché
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map(p => (
                <Link
                  to={`/produit/${p.id}`}
                  key={p.id}
                  className="group bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-lg transition-all"
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-muted-foreground/30">eco</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-headline font-bold text-sm text-foreground mb-1">{p.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-headline font-extrabold text-foreground">{formatPrice(p.price)}</span>
                      <span className="text-xs text-muted-foreground">{p.unit}</span>
                    </div>
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
