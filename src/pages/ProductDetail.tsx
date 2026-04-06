import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import ProductCard from "@/components/ProductCard";

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

      // Related products (same category)
      const { data: rel } = await supabase
        .from("products")
        .select("*, categories(name, icon)")
        .eq("is_active", true)
        .neq("id", id)
        .limit(8);
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

  const handleAddRelated = (p: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: p.id,
      name: p.name,
      price: formatPrice(p.price),
      priceNum: p.price,
      unit: p.unit,
      image: p.image_url || "/placeholder.svg",
      farmer: "Producteur",
      shopId: p.shop_id,
    });
  };

  const sellerName = sellerProfile?.full_name || shop?.name || "Producteur";
  const sellerCity = sellerProfile?.city || shop?.city || "Sénégal";
  const totalPrice = product.price * quantity;

  return (
    <div className="min-h-screen bg-background pb-0 md:pb-0">
      <div className="hidden md:block"><Navbar /></div>

      <main className="pt-0 md:pt-24">
        {/* ═══════ MOBILE VIEW ═══════ */}
        <div className="md:hidden pb-24">
          {/* Fixed header with X and share */}
          <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 safe-area-top">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface">close</span>
            </button>
            <button className="w-10 h-10 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface">ios_share</span>
            </button>
          </div>

          {/* Product Image */}
          <div
            className="relative w-full aspect-[4/3] bg-surface-container-lowest overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {images[currentImage] ? (
                  <img src={images[currentImage]} alt={product.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-8xl text-on-surface-variant/20">eco</span>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`rounded-full transition-all ${i === currentImage ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-on-surface-variant/30"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Product Info */}
          <div className="px-5 pt-4 pb-3">
            {/* Stock badge */}
            {product.stock > 0 && (
              <span className="inline-block text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full mb-2">
                {product.stock > 10 ? "En stock" : `Plus que ${product.stock}`}
              </span>
            )}

            <h1 className="text-xl font-headline font-extrabold tracking-tight leading-tight">
              {product.name}
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">{product.unit}</p>

            <div className="mt-2">
              <span className="text-xl font-headline font-extrabold">{formatPrice(product.price)}</span>
            </div>
          </div>

          <div className="h-px bg-border/40 mx-5" />

          {/* Quantity Selector */}
          <div className="px-5 py-4">
            <div className="inline-flex items-center gap-0 bg-surface-container rounded-full">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-lowest transition-colors"
              >
                <span className="material-symbols-outlined text-lg">remove</span>
              </button>
              <span className="w-10 text-center font-headline font-extrabold text-base">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-lowest transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            </div>
          </div>

          {/* Seller info */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl p-3 border border-border/20">
              <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center overflow-hidden shrink-0">
                {sellerProfile?.avatar_url ? (
                  <img src={sellerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-primary text-sm">person</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-extrabold text-sm truncate">{sellerName}</p>
                <p className="text-[10px] text-on-surface-variant">{sellerCity}</p>
              </div>
              {(shop?.phone || sellerProfile?.phone) && (
                <a href={`tel:${shop?.phone || sellerProfile?.phone}`} className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-primary-container text-sm">call</span>
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="px-5 py-3">
              <h3 className="font-headline font-extrabold text-sm mb-1">Description</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          <div className="h-2 bg-surface-container my-2" />

          {/* Similar Items */}
          {related.length > 0 && (
            <div className="px-5 py-4">
              <h3 className="font-headline font-extrabold text-base mb-3">Produits similaires</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {related.map(p => (
                  <div key={p.id} className="shrink-0 w-[150px]">
                    <ProductCard product={p} onAddToCart={handleAddRelated} formatPrice={(n) => n.toLocaleString("fr-FR")} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sticky bottom Add to Cart bar */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/30 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="w-full bg-foreground text-background py-4 rounded-xl font-headline font-extrabold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              Ajouter {quantity > 1 ? `${quantity}` : "1"} au panier · {formatPrice(totalPrice)}
            </button>
          </div>
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
                  className="relative rounded-2xl overflow-hidden aspect-square bg-surface-container-lowest mb-4"
                >
                  {images[currentImage] ? (
                    <img src={images[currentImage]} alt={product.name} className="w-full h-full object-contain p-8" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-8xl text-on-surface-variant/30">eco</span>
                    </div>
                  )}
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
                {product.categories?.name && (
                  <span className="px-4 py-1.5 rounded-full border border-border text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant w-fit mb-4">
                    {product.categories.name}
                  </span>
                )}

                <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mb-4">{product.name}</h1>

                {product.description && (
                  <p className="text-lg text-on-surface-variant font-body leading-relaxed mb-6">{product.description}</p>
                )}

                <div className="flex items-center gap-6 mb-8">
                  <div>
                    <div className="text-sm text-on-surface-variant mb-1">{product.unit}</div>
                    <div className="text-4xl font-headline font-extrabold">{formatPrice(product.price)}</div>
                  </div>
                </div>

                {/* Quantity + Add */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="inline-flex items-center gap-0 bg-surface-container rounded-full">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-lowest transition-colors">
                      <span className="material-symbols-outlined text-lg">remove</span>
                    </button>
                    <span className="w-10 text-center font-headline font-extrabold">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-lowest transition-colors">
                      <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0}
                    className="flex-1 bg-foreground text-background px-8 py-4 rounded-xl font-headline font-extrabold text-base flex items-center justify-center gap-3 hover:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    Ajouter au panier · {formatPrice(totalPrice)}
                  </button>
                </div>

                {/* Seller */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 border border-border/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary-container/20 flex items-center justify-center overflow-hidden shrink-0">
                      {sellerProfile?.avatar_url ? (
                        <img src={sellerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-xl">person</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-headline font-extrabold">{sellerName}</p>
                      <p className="text-sm text-on-surface-variant">{sellerCity}</p>
                    </div>
                    {(shop?.phone || sellerProfile?.phone) && (
                      <a
                        href={`tel:${shop?.phone || sellerProfile?.phone}`}
                        className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-5 py-2.5 rounded-full font-headline font-bold text-sm hover:scale-95 transition-transform"
                      >
                        <span className="material-symbols-outlined text-base">call</span>
                        Appeler
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Related Products */}
          {related.length > 0 && (
            <section className="py-16 px-6 md:px-12 max-w-[1440px] mx-auto">
              <h2 className="text-3xl font-headline font-extrabold tracking-tighter mb-8">Produits similaires</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {related.map(p => (
                  <ProductCard key={p.id} product={p} onAddToCart={handleAddRelated} formatPrice={(n) => n.toLocaleString("fr-FR")} />
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
