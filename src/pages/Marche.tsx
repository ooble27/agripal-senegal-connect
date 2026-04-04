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

  const formatPrice = (n: number) => n.toLocaleString("fr-FR");

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const productsByCategory = categories
    .map((cat) => ({
      category: cat,
      items: products.filter((p) => p.category_id === cat.id && p.is_active),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-20 md:pb-0">
      <Navbar />
      <main className="pt-20">

        {/* ═══════ MOBILE HEADER ═══════ */}
        <section className="md:hidden px-5 pt-3 pb-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-headline font-extrabold tracking-tight">
                Salut{user ? `, ${firstName}` : ""} 👋
              </p>
              <p className="text-xs text-on-surface-variant">Qu'est-ce qu'on cuisine aujourd'hui ?</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">notifications</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═══════ SEARCH ═══════ */}
        <section className="px-5 md:px-12 pt-3 md:pt-8 max-w-[1440px] mx-auto">
          <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-primary font-headline font-extrabold text-xs uppercase tracking-widest">Catalogue</span>
              <h1 className="text-3xl md:text-5xl font-headline font-extrabold tracking-tighter mt-1">Le Marché</h1>
            </div>
            <div className="text-sm text-on-surface-variant font-headline font-bold">
              {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</span>
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container border-none font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </section>

        {/* ═══════ PROMO BANNER (mobile) ═══════ */}
        <section className="md:hidden px-5 mt-4">
          <div className="relative bg-primary rounded-2xl p-5 flex items-center">
            <div className="flex-1 relative z-10">
              <span className="inline-block bg-primary-container text-primary-container-foreground text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg mb-2">
                Nouveau 🌿
              </span>
              <h3 className="text-surface font-headline font-extrabold text-lg leading-tight mb-1">
                Produits Frais<br />Chaque Jour
              </h3>
              <Link
                to="/marche"
                className="inline-block bg-surface-container-lowest text-primary text-xs font-bold px-4 py-2 rounded-lg mt-2"
              >
                Voir tout
              </Link>
            </div>
            <img src={fruitsPromo} alt="Fruits frais" className="w-36 h-36 object-contain -mr-4 -mb-6 -mt-4 relative z-10" />
          </div>
        </section>

        {/* ═══════ CATEGORIES (horizontal tabs) ═══════ */}
        <section className="px-5 md:px-12 mt-4 md:mt-0 md:mb-8 max-w-[1440px] mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-headline font-bold transition-colors ${
                !selectedCategory
                  ? "bg-foreground text-background"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              Tout
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-headline font-bold transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-foreground text-background"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {cat.icon && <span className="material-symbols-outlined text-sm">{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        </section>

        {/* ═══════ PRODUCTS ═══════ */}
        <section className="mt-3 md:mt-0 max-w-[1440px] mx-auto pb-4">
          {loading ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 mx-5">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">search_off</span>
              <p className="font-headline font-bold text-lg mb-2">Aucun produit trouvé</p>
              <p className="text-on-surface-variant text-sm">
                {searchQuery ? "Essayez avec d'autres termes." : "Aucun produit dans cette catégorie."}
              </p>
            </div>
          ) : selectedCategory || searchQuery ? (
            /* Filtered: mixed layout */
            <div className="px-5 md:px-12">
              {/* First 2 as featured horizontal cards */}
              {filtered.slice(0, 2).map((product) => (
                <HorizontalCard key={product.id} product={product} onAddToCart={handleAddToCart} formatPrice={formatPrice} />
              ))}
              {/* Rest as compact grid */}
              {filtered.length > 2 && (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-2">
                  {filtered.slice(2).map((product) => (
                    <CompactCard key={product.id} product={product} onAddToCart={handleAddToCart} formatPrice={formatPrice} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Default: category sections with mixed layouts */
            <div className="space-y-6">
              {productsByCategory.map((group, groupIndex) => (
                <div key={group.category.id}>
                  <div className="flex items-center justify-between px-5 md:px-12 mb-2">
                    <h3 className="font-headline font-extrabold text-sm md:text-lg flex items-center gap-2">
                      {group.category.icon && (
                        <span className="material-symbols-outlined text-primary text-base">{group.category.icon}</span>
                      )}
                      {group.category.name}
                    </h3>
                    <button
                      onClick={() => setSelectedCategory(group.category.id)}
                      className="text-[11px] font-headline font-bold text-primary"
                    >
                      Voir tout →
                    </button>
                  </div>

                  {/* Alternate between horizontal scroll and horizontal cards */}
                  {groupIndex % 2 === 0 ? (
                    /* Horizontal scroll row */
                    <div className="flex gap-2.5 overflow-x-auto px-5 md:px-12 pb-1 scrollbar-hide">
                      {group.items.slice(0, 8).map((product) => (
                        <div key={product.id} className="shrink-0 w-[130px] md:w-[180px]">
                          <CompactCard product={product} onAddToCart={handleAddToCart} formatPrice={formatPrice} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Horizontal list cards */
                    <div className="px-5 md:px-12 space-y-2">
                      {group.items.slice(0, 4).map((product) => (
                        <HorizontalCard key={product.id} product={product} onAddToCart={handleAddToCart} formatPrice={formatPrice} />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* All products as tight grid */}
              <div>
                <div className="px-5 md:px-12 mb-2">
                  <h3 className="font-headline font-extrabold text-sm md:text-lg">Tous les produits</h3>
                </div>
                <div className="px-5 md:px-12 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {filtered.map((product) => (
                    <CompactCard key={product.id} product={product} onAddToCart={handleAddToCart} formatPrice={formatPrice} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="hidden md:block mt-8">
          <Footer />
        </div>
      </main>
    </div>
  );
};

/* ═══════ COMPACT CARD (grid/scroll) ═══════ */
const CompactCard = ({
  product,
  onAddToCart,
  formatPrice,
}: {
  product: Product;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  formatPrice: (n: number) => string;
}) => (
  <Link to={`/produit/${product.id}`} className="block">
    <div className="relative">
      <div className="aspect-square rounded-xl overflow-hidden bg-surface-container mb-1.5">
        {product.image_url ? (
          <img
            alt={product.name}
            className="w-full h-full object-cover"
            src={product.image_url}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-on-surface-variant/20">eco</span>
          </div>
        )}

        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-foreground/40 rounded-xl flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded-lg text-[9px] font-bold">Rupture</span>
          </div>
        )}
      </div>

      {/* Quick add floating */}
      <button
        onClick={(e) => onAddToCart(product, e)}
        disabled={product.stock <= 0}
        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
      >
        <span className="material-symbols-outlined text-foreground text-sm">add</span>
      </button>
    </div>

    <p className="text-[11px] md:text-xs font-headline font-bold leading-tight line-clamp-2 text-foreground">
      {product.name}
    </p>
    <p className="text-[11px] md:text-sm font-headline font-extrabold text-primary mt-0.5">
      {formatPrice(product.price)} <span className="text-on-surface-variant font-normal text-[9px]">FCFA/{product.unit}</span>
    </p>
  </Link>
);

/* ═══════ HORIZONTAL CARD (list style) ═══════ */
const HorizontalCard = ({
  product,
  onAddToCart,
  formatPrice,
}: {
  product: Product;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  formatPrice: (n: number) => string;
}) => (
  <Link to={`/produit/${product.id}`} className="block">
    <div className="flex items-center gap-3 py-3 border-b border-border/10">
      {/* Image */}
      <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-xl overflow-hidden bg-surface-container">
        {product.image_url ? (
          <img alt={product.name} className="w-full h-full object-cover" src={product.image_url} loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-on-surface-variant/20">eco</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-headline font-bold leading-tight line-clamp-2 text-foreground">
          {product.name}
        </p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          {product.categories?.name} · {product.unit}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-base font-headline font-extrabold text-primary">
            {formatPrice(product.price)}
          </span>
          <span className="text-[10px] text-on-surface-variant">FCFA</span>
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={(e) => onAddToCart(product, e)}
        disabled={product.stock <= 0}
        className="w-10 h-10 shrink-0 rounded-xl bg-primary-container text-primary-container-foreground flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
      >
        <span className="material-symbols-outlined text-lg">add</span>
      </button>
    </div>
  </Link>
);

export default Marche;
