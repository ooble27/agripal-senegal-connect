import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import fruitsPromo from "@/assets/fruits-promo.png";

type Product = Tables<"products"> & {
  shops: { name: string; seller_id: string } | null;
  categories: { name: string; icon: string | null } | null;
  seller_profile?: { full_name: string } | null;
};

type Category = Tables<"categories">;

const Marche = () => {
  const { addItem } = useCart();
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from("products")
          .select("*, shops(name, seller_id), categories(name, icon)")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
      ]);
      if (prodRes.data) setProducts(prodRes.data as Product[]);
      if (catRes.data) setCategories(catRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = !selectedCategory || p.category_id === selectedCategory;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price.toLocaleString("fr-FR") + " FCFA",
      priceNum: product.price,
      unit: product.unit,
      image: product.image_url || "/placeholder.svg",
      farmer: product.shops?.name || "Producteur",
      shopId: product.shop_id,
    });
  };

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Group products by category for horizontal scroll sections
  const productsByCategory = categories
    .map((cat) => ({
      category: cat,
      items: products.filter((p) => p.category_id === cat.id && p.is_active),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="pt-20">

        {/* ═══════ MOBILE GREETING HEADER ═══════ */}
        <section className="md:hidden px-5 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-on-primary-container text-lg">person</span>
                )}
              </div>
              <div>
                <p className="text-base font-headline font-extrabold">
                  Salut{user ? `, ${firstName}` : ""} 👋
                </p>
                <p className="text-xs text-on-surface-variant">Trouvez vos produits frais</p>
              </div>
            </div>
            <button className="w-10 h-10 rounded-full bg-surface-container-lowest border border-border/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">notifications</span>
            </button>
          </div>
        </section>

        {/* ═══════ SEARCH BAR ═══════ */}
        <section className="px-5 md:px-12 pt-3 md:pt-8 max-w-[1440px] mx-auto">
          {/* Desktop header */}
          <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-primary font-headline font-extrabold text-xs uppercase tracking-widest">Catalogue</span>
              <h1 className="text-3xl md:text-5xl font-headline font-extrabold tracking-tighter mt-1">Le Marché</h1>
              <p className="text-on-surface-variant text-sm md:text-base mt-2 max-w-lg">
                Découvrez tous les produits frais de nos artisans locaux.
              </p>
            </div>
            <div className="text-sm text-on-surface-variant font-headline font-bold">
              {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 md:py-3.5 rounded-2xl bg-surface-container-lowest border border-border/30 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center md:hidden">
              <span className="material-symbols-outlined text-on-primary-container text-base">tune</span>
            </button>
          </div>
        </section>

        {/* ═══════ PROMO BANNER (mobile) ═══════ */}
        <section className="md:hidden px-5 mt-4">
          <div className="relative bg-primary rounded-2xl p-5 flex items-center">
            <div className="flex-1 relative z-10">
              <span className="inline-block bg-primary-container text-primary-container-foreground text-[10px] font-bold uppercase px-2.5 py-1 rounded-full mb-2">
                Nouveau 🌿
              </span>
              <h3 className="text-surface font-headline font-extrabold text-lg leading-tight mb-1">
                Produits Frais<br />Chaque Jour
              </h3>
              <Link
                to="/marche"
                className="inline-block bg-surface-container-lowest text-primary text-xs font-bold px-4 py-2 rounded-full mt-2"
              >
                Voir tout
              </Link>
            </div>
            <img src={fruitsPromo} alt="Fruits frais" className="w-36 h-36 object-contain -mr-4 -mb-6 -mt-4 relative z-10" />
          </div>
        </section>

        {/* ═══════ CATEGORIES ═══════ */}
        <section className="px-5 md:px-12 mt-5 md:mt-0 md:mb-8 max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between mb-3 md:hidden">
            <h3 className="font-headline font-extrabold text-sm">Catégories</h3>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-primary text-xs font-bold"
            >
              Voir tout
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-headline font-extrabold transition-colors ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-lowest text-on-surface-variant border border-border/30"
              }`}
            >
              Tout
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-headline font-extrabold transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-container-lowest text-on-surface-variant border border-border/30"
                }`}
              >
                {cat.icon && <span className="material-symbols-outlined text-sm">{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        </section>

        {/* ═══════ PRODUCT SECTIONS ═══════ */}
        <section className="mt-4 md:mt-0 max-w-[1440px] mx-auto">
          {loading ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 mx-4 bg-surface-container-low rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">search_off</span>
              <p className="font-headline font-bold text-lg mb-2">Aucun produit trouvé</p>
              <p className="text-on-surface-variant text-sm">
                {searchQuery ? "Essayez avec d'autres termes." : "Aucun produit dans cette catégorie."}
              </p>
            </div>
          ) : selectedCategory || searchQuery ? (
            /* Grid view when filtering/searching */
            <div className="px-4 md:px-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} onAddToCart={handleAddToCart} formatPrice={formatPrice} />
              ))}
            </div>
          ) : (
            /* Horizontal scroll sections by category (Uber Eats style) */
            <div className="space-y-6 md:space-y-10">
              {productsByCategory.map((group) => (
                <div key={group.category.id}>
                  <div className="flex items-center justify-between px-5 md:px-12 mb-3">
                    <div className="flex items-center gap-2">
                      {group.category.icon && (
                        <span className="material-symbols-outlined text-primary text-lg">{group.category.icon}</span>
                      )}
                      <h3 className="font-headline font-extrabold text-base md:text-xl">{group.category.name}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedCategory(group.category.id)}
                      className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto px-5 md:px-12 pb-2 scrollbar-hide">
                    {group.items.slice(0, 8).map((product, i) => (
                      <div key={product.id} className="shrink-0 w-[160px] md:w-[200px]">
                        <ProductCard product={product} index={i} onAddToCart={handleAddToCart} formatPrice={formatPrice} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* All products section */}
              <div>
                <div className="flex items-center justify-between px-5 md:px-12 mb-3">
                  <h3 className="font-headline font-extrabold text-base md:text-xl">Tous les produits</h3>
                </div>
                <div className="px-4 md:px-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                  {filtered.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} onAddToCart={handleAddToCart} formatPrice={formatPrice} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Desktop Footer only */}
        <div className="hidden md:block mt-12">
          <Footer />
        </div>
      </main>
    </div>
  );
};

/* ═══════ PRODUCT CARD COMPONENT (Uber Eats / Costco style) ═══════ */
const ProductCard = ({
  product,
  index,
  onAddToCart,
  formatPrice,
}: {
  product: Product;
  index: number;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  formatPrice: (n: number) => string;
}) => (
  <Link to={`/produit/${product.id}`}>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="group bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col h-full border border-border/10 hover:shadow-lg transition-all"
    >
      {/* Image with + button overlay */}
      <div className="relative aspect-square overflow-hidden bg-surface-container">
        {product.image_url ? (
          <img
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            src={product.image_url}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/20">eco</span>
          </div>
        )}

        {/* + Add button (bottom-right of image) */}
        <button
          onClick={(e) => onAddToCart(product, e)}
          disabled={product.stock <= 0}
          className="absolute bottom-2 right-2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center hover:bg-primary hover:text-primary-foreground active:scale-90 transition-all disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>

        {/* Out of stock overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-[10px] font-bold">Rupture</span>
          </div>
        )}

        {/* Stock badge */}
        {product.stock > 0 && product.stock <= 5 && (
          <div className="absolute top-2 left-2">
            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
              Plus que {product.stock}
            </span>
          </div>
        )}
      </div>

      {/* Info below image */}
      <div className="p-2.5 md:p-4 flex flex-col flex-grow">
        <span className="text-sm md:text-lg font-headline font-extrabold text-primary leading-tight">
          {formatPrice(product.price)}
        </span>
        <h3 className="text-xs md:text-sm font-headline font-bold leading-tight mt-1 line-clamp-2 text-foreground">
          {product.name}
        </h3>
        <p className="text-[10px] md:text-xs text-on-surface-variant mt-0.5">{product.unit}</p>
      </div>
    </motion.div>
  </Link>
);

type Product = Tables<"products"> & {
  shops: { name: string; seller_id: string } | null;
  categories: { name: string; icon: string | null } | null;
  seller_profile?: { full_name: string } | null;
};

export default Marche;
