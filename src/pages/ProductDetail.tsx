import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Shop = Tables<"shops"> & { profiles?: { full_name: string; avatar_url: string | null } | null };
type Product = Tables<"products"> & { shops: Shop | null };

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("products")
      .select("*, shops(*, profiles:seller_id(full_name, avatar_url))")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          const prod = data as unknown as Product;
          setProduct(prod);
          if (prod.shops) setShop(prod.shops);
          supabase
            .from("products")
            .select("*, shops(name, location, seller_id)")
            .eq("shop_id", prod.shop_id)
            .neq("id", prod.id)
            .eq("is_active", true)
            .limit(3)
            .then(({ data: rel }) => {
              if (rel) setRelated(rel as unknown as Product[]);
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
          <Link to="/" className="inline-block bg-primary-container text-primary-container-foreground px-8 py-4 rounded-full font-headline font-bold hover:scale-95 transition-transform">
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
        <section className="px-6 md:px-12 max-w-[1440px] mx-auto pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl overflow-hidden aspect-square bg-surface-container-lowest"
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
              {product.shops && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-base">storefront</span>
                  </div>
                  <span className="font-headline font-bold text-sm text-primary">{product.shops.name}</span>
                  {product.shops.location && (
                    <span className="text-on-surface-variant text-xs">• {product.shops.location}</span>
                  )}
                </div>
              )}

              <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mb-4">{product.name}</h1>

              {product.description && (
                <p className="text-base text-on-surface-variant font-body leading-relaxed mb-8">{product.description}</p>
              )}

              <div className="flex items-end gap-4 mb-6">
                <div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-wider">{product.unit}</div>
                  <div className="text-4xl font-headline font-extrabold">{formatPrice(product.price)}</div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${product.stock > 0 ? "bg-primary-container/20 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {product.stock > 0 ? `${product.stock} en stock` : "Épuisé"}
                </div>
              </div>

              {/* Quantity selector */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-sm font-bold text-on-surface-variant">Quantité :</span>
                <div className="flex items-center bg-surface-container-low rounded-full">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-lg">remove</span>
                  </button>
                  <span className="w-10 text-center font-headline font-bold">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  for (let i = 0; i < quantity; i++) {
                    addItem({
                      id: product.id,
                      name: product.name,
                      price: formatPrice(product.price),
                      priceNum: product.price,
                      unit: product.unit,
                      image: product.image_url || "/placeholder.svg",
                      farmer: product.shops?.name || "Vendeur",
                      shopId: product.shop_id,
                    });
                  }
                }}
                disabled={product.stock <= 0}
                className="w-full bg-primary-container text-primary-container-foreground px-8 py-5 rounded-full font-headline font-extrabold text-lg flex items-center justify-center gap-3 hover:scale-[0.97] transition-transform disabled:opacity-50 mb-8"
              >
                <span className="material-symbols-outlined">add_shopping_cart</span>
                Ajouter au Panier — {formatPrice(product.price * quantity)}
              </button>

              {/* Traçabilité */}
              <div className="bg-surface-container-lowest rounded-3xl p-6 space-y-4">
                <h3 className="font-headline font-extrabold text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">verified</span>
                  Traçabilité & Garanties
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-lg mt-0.5">eco</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Origine</div>
                      <div className="text-sm font-bold">{product.shops?.location || product.shops?.city || "Sénégal"}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-lg mt-0.5">local_shipping</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Livraison</div>
                      <div className="text-sm font-bold">24-48h à Dakar</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-lg mt-0.5">payments</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Paiement</div>
                      <div className="text-sm font-bold">Wave / Orange Money</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-lg mt-0.5">shield</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Garantie</div>
                      <div className="text-sm font-bold">Qualité vérifiée</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Seller Profile */}
        {shop && (
          <section className="px-6 md:px-12 max-w-[1440px] mx-auto pb-16">
            <div className="bg-surface-container-lowest rounded-3xl p-8 flex flex-col md:flex-row items-start gap-8">
              <div className="w-20 h-20 rounded-3xl bg-primary-container/20 flex items-center justify-center shrink-0">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover rounded-3xl" />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-primary">storefront</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-headline font-extrabold">{shop.name}</h3>
                  <span className="bg-primary-container/20 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Vérifié</span>
                </div>
                {shop.description && (
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-4">{shop.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  {shop.location && (
                    <span className="flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {shop.location}{shop.city && `, ${shop.city}`}
                    </span>
                  )}
                  {shop.phone && (
                    <span className="flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">call</span>
                      {shop.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Related Products */}
        {related.length > 0 && (
          <section className="py-16 px-6 md:px-12 max-w-[1440px] mx-auto">
            <h2 className="text-2xl font-headline font-extrabold tracking-tighter mb-8">Du même vendeur</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map(p => (
                <Link to={`/produit/${p.id}`} key={p.id} className="bg-surface-container-lowest rounded-3xl overflow-hidden hover:shadow-lg transition-shadow">
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
                    <h3 className="font-headline font-bold text-sm">{p.name}</h3>
                    <div className="text-lg font-headline font-extrabold mt-2">{formatPrice(p.price)}</div>
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
