import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products"> & {
  categories: { name: string; icon: string | null } | null;
};

type ProductImage = Tables<"product_images">;

type SellerProfile = {
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  phone: string | null;
};

type ShopInfo = {
  name: string;
  seller_id: string;
  city: string | null;
  phone: string | null;
  location: string | null;
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setQuantity(1);
    setCurrentImage(0);

    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name, icon)")
        .eq("id", id)
        .single();

      if (!data) { setLoading(false); return; }
      const product = data as Product;
      setProduct(product);

      // Fetch shop info
      const { data: shopData } = await supabase
        .from("shops")
        .select("name, seller_id, city, phone, location")
        .eq("id", product.shop_id)
        .single();
      if (shopData) {
        setShop(shopData);
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, city, phone")
          .eq("user_id", shopData.seller_id)
          .single();
        if (prof) setSellerProfile(prof);
      }

      // Fetch product images
      const { data: prodImages } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", id)
        .order("display_order");

      const imgList: string[] = [];
      if (prodImages && prodImages.length > 0) {
        imgList.push(...prodImages.map((img: ProductImage) => img.image_url));
      }
      if (imgList.length === 0 && product.image_url) {
        imgList.push(product.image_url);
      }
      setImages(imgList);

      // Related products
      const { data: rel } = await supabase
        .from("products")
        .select("*, categories(name, icon)")
        .eq("shop_id", product.shop_id)
        .neq("id", id)
        .eq("is_active", true)
        .limit(4);
      if (rel) setRelated(rel as Product[]);

      setLoading(false);
    };
    load();
  }, [id]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentImage < images.length - 1) setCurrentImage(c => c + 1);
      if (diff < 0 && currentImage > 0) setCurrentImage(c => c - 1);
    }
    setTouchStart(null);
  };

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
          <Link to="/marche" className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-full font-headline font-extrabold hover:scale-95 transition-transform">
            Retour au Marché
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: formatPrice(product.price),
        priceNum: product.price,
        unit: product.unit,
        image: images[0] || "/placeholder.svg",
        farmer: sellerProfile?.full_name || shop?.name || "Vendeur",
        shopId: product.shop_id,
      });
    }
  };

  const sellerName = sellerProfile?.full_name || shop?.name || "Producteur";
  const sellerCity = sellerProfile?.city || shop?.city || "Sénégal";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <div className="hidden md:block"><Navbar /></div>

      <main className="pt-0 md:pt-24">
        {/* ═══════ MOBILE VIEW ═══════ */}
        <div className="md:hidden">
          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface">arrow_back</span>
            </button>
            <h2 className="font-headline font-extrabold text-base">Détails</h2>
            <button className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant">share</span>
            </button>
          </div>

          {/* Image Carousel */}
          <div
            className="relative w-full aspect-square bg-surface-container mt-14 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                {images[currentImage] ? (
                  <img src={images[currentImage]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-8xl text-on-surface-variant/20">eco</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-destructive">favorite</span>
            </button>

            {/* Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`rounded-full transition-all ${i === currentImage ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-surface-container-lowest/60"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-start justify-between mb-1">
              <h1 className="text-2xl font-headline font-extrabold tracking-tight flex-1">{product.name}</h1>
            </div>
            <p className="text-xs text-on-surface-variant mb-1">{product.unit}</p>
            <span className="text-2xl font-headline font-extrabold text-primary">{formatPrice(product.price)}</span>

            {/* Info chips */}
            <div className="flex items-center gap-3 mt-4 mb-5 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant shrink-0 bg-surface-container-lowest px-3 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-primary text-sm">local_shipping</span>
                Livraison 24h
              </div>
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant shrink-0 bg-surface-container-lowest px-3 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-primary text-sm">eco</span>
                Bio
              </div>
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant shrink-0 bg-surface-container-lowest px-3 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                4.5
              </div>
            </div>

            {/* Description */}
            <h3 className="font-headline font-extrabold text-base mb-2">Description</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              {product.description || "Produit frais cultivé avec soin par nos agriculteurs locaux. Sans pesticides, récolté à maturité pour vous garantir la meilleure qualité."}
            </p>

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-0 bg-surface-container-lowest border border-border/30 rounded-full">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-base">remove</span>
                </button>
                <span className="w-8 text-center font-headline font-extrabold text-base">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-base">add</span>
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="flex-1 bg-primary-container text-primary-container-foreground py-3.5 rounded-full font-headline font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
              >
                Ajouter au panier
              </button>
            </div>
          </div>

          {/* Seller card */}
          <div className="mx-5 mb-4">
            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-border/20 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center overflow-hidden shrink-0">
                {sellerProfile?.avatar_url ? (
                  <img src={sellerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-primary">person</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-extrabold text-sm truncate">{sellerName}</p>
                <p className="text-[10px] text-on-surface-variant">{sellerCity}</p>
              </div>
              {(shop?.phone || sellerProfile?.phone) && (
                <a href={`tel:${shop?.phone || sellerProfile?.phone}`} className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-primary-container text-sm">call</span>
                </a>
              )}
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="px-5 pb-6">
              <h3 className="font-headline font-extrabold text-base mb-3">Du même producteur</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {related.map(p => (
                  <Link to={`/produit/${p.id}`} key={p.id} className="shrink-0 w-36 bg-surface-container-lowest rounded-2xl overflow-hidden border border-border/20">
                    <div className="aspect-square overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-3xl text-on-surface-variant/20">eco</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-headline font-bold truncate">{p.name}</p>
                      <p className="text-xs font-extrabold text-primary mt-0.5">{formatPrice(p.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════ DESKTOP VIEW ═══════ */}
        <div className="hidden md:block">
          {/* Breadcrumb */}
          <div className="px-6 md:px-12 max-w-[1440px] mx-auto py-6">
            <nav className="flex items-center gap-2 text-sm text-on-surface-variant font-body">
              <Link to="/marche" className="hover:text-primary transition-colors">Marché</Link>
              <span className="material-symbols-outlined text-base">chevron_right</span>
              <span className="text-foreground font-medium">{product.name}</span>
            </nav>
          </div>

          {/* Product Hero */}
          <section className="px-6 md:px-12 max-w-[1440px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Image gallery */}
              <div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="relative rounded-2xl overflow-hidden aspect-square bg-inverse-surface mb-4"
                >
                  {images[currentImage] ? (
                    <img src={images[currentImage]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-inverse-surface">
                      <span className="material-symbols-outlined text-8xl text-inverse-on-surface/30">eco</span>
                    </div>
                  )}
                  <div className="absolute top-5 left-5">
                    <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-headline font-bold uppercase tracking-wider">
                      Frais du matin
                    </span>
                  </div>
                </motion.div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-3">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImage(i)}
                        className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${i === currentImage ? "border-primary ring-2 ring-primary/20" : "border-border/20 opacity-60 hover:opacity-100"}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  {product.categories?.name && (
                    <span className="px-4 py-1.5 rounded-full border border-border text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant">
                      {product.categories.name}
                    </span>
                  )}
                  <span className="px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-xs font-headline font-bold uppercase tracking-wider text-primary">
                    Bio Sénégal
                  </span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold tracking-tighter mb-6">{product.name}</h1>

                {product.description && (
                  <p className="text-lg text-on-surface-variant font-body leading-relaxed mb-8">{product.description}</p>
                )}

                <div className="flex items-center gap-6 mb-8">
                  <div>
                    <div className="text-sm text-on-surface-variant mb-1">{product.unit}</div>
                    <div className="text-4xl font-headline font-extrabold">{formatPrice(product.price)}</div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-lg">local_shipping</span>
                    Livraison 24h
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-10">
                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0}
                    className="flex-1 bg-primary text-primary-foreground px-8 py-5 rounded-full font-headline font-extrabold text-lg flex items-center justify-center gap-3 hover:scale-[0.97] transition-transform shadow-xl disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">add_shopping_cart</span>
                    Ajouter au Panier
                  </button>
                  <button className="w-14 h-14 rounded-full border border-border flex items-center justify-center hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">favorite</span>
                  </button>
                  <button className="w-14 h-14 rounded-full border border-border flex items-center justify-center hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">share</span>
                  </button>
                </div>

                {/* Nutritional info */}
                <div className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 border border-border/30">
                  <h3 className="text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-5">Valeurs Nutritionnelles</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {[
                      { val: "41 kcal", label: "Calories" },
                      { val: "2.8g", label: "Fibres" },
                      { val: "835 µg", label: "Vitamine A" },
                      { val: "320 mg", label: "Potassium" },
                    ].map((n, i) => (
                      <div key={i}>
                        <div className="text-lg font-headline font-extrabold">{n.val}</div>
                        <div className="text-xs text-on-surface-variant mt-1">{n.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Traceability */}
          <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
            <div className="mb-2">
              <span className="text-xs font-headline font-bold uppercase tracking-widest text-primary">Du champ à votre table</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mb-2">Traçabilité Complète</h2>
            <div className="w-16 h-1 bg-primary rounded-full mb-12" />

            <div className="bg-surface-container-lowest rounded-2xl border border-border/30 p-8">
              <div className="flex flex-wrap gap-12 mb-8 pb-8 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
                  <div>
                    <div className="text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant">Parcelle</div>
                    <div className="font-headline font-bold">{shop?.location || "Non renseigné"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">eco</span>
                  <div>
                    <div className="text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant">Méthode</div>
                    <div className="font-headline font-bold">Agriculture biologique</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                {[
                  { icon: "grass", label: "Semis", value: "Janvier 2026" },
                  { icon: "water_drop", label: "Irrigation", value: "Goutte-à-goutte solaire" },
                  { icon: "landscape", label: "Sol", value: "Sol argilo-sableux enrichi au compost" },
                  { icon: "schedule", label: "Durée", value: "75 jours" },
                  { icon: "agriculture", label: "Récolte", value: "Mars 2026" },
                  { icon: "verified", label: "Certification", value: "Bio Sénégal" },
                ].map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-on-surface-variant">{step.icon}</span>
                    </div>
                    <div className="text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-1">{step.label}</div>
                    <div className="text-sm font-headline font-bold leading-snug">{step.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Producer Section */}
          <section className="px-6 md:px-12 max-w-[1440px] mx-auto mb-24">
            <div className="bg-inverse-surface rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
              <div className="shrink-0">
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-primary overflow-hidden bg-inverse-surface">
                  {sellerProfile?.avatar_url ? (
                    <img src={sellerProfile.avatar_url} alt={sellerName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-inverse-on-surface/40">person</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <span className="text-xs font-headline font-bold uppercase tracking-widest text-primary mb-2 inline-block">Votre Producteur</span>
                <h3 className="text-4xl md:text-5xl font-headline font-extrabold text-surface mb-3">{sellerName}</h3>
                <div className="flex items-center justify-center md:justify-start gap-4 text-inverse-on-surface text-sm mb-6">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {sellerCity}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <div className="text-3xl font-headline font-extrabold text-primary">100%</div>
                    <div className="text-xs text-inverse-on-surface mt-1">Prix Équitable</div>
                  </div>
                  <div>
                    <div className="text-3xl font-headline font-extrabold text-primary">24h</div>
                    <div className="text-xs text-inverse-on-surface mt-1">Champ → Table</div>
                  </div>
                  <div>
                    <div className="text-3xl font-headline font-extrabold text-primary">0</div>
                    <div className="text-xs text-inverse-on-surface mt-1">Intermédiaires</div>
                  </div>
                </div>
                {(shop?.phone || sellerProfile?.phone) && (
                  <a
                    href={`tel:${shop?.phone || sellerProfile?.phone}`}
                    className="mt-6 inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-6 py-3 rounded-full font-headline font-bold text-sm hover:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-base">call</span>
                    Contacter le producteur
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Related Products */}
          {related.length > 0 && (
            <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mb-2">Du Même Producteur</h2>
              <div className="w-16 h-1 bg-primary rounded-full mb-12" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {related.map(p => (
                  <Link to={`/produit/${p.id}`} key={p.id} className="group bg-surface-container-lowest rounded-2xl overflow-hidden border border-border/30 hover:shadow-xl transition-all">
                    <div className="h-64 bg-surface-container overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-5xl text-on-surface-variant/20">eco</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-headline font-extrabold text-lg mb-1">{p.name}</h3>
                      <div className="text-xs text-on-surface-variant mb-1">{p.unit}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-headline font-extrabold">{formatPrice(p.price)}</span>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
};

export default ProductDetail;
