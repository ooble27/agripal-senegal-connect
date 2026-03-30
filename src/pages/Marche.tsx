import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products"> & {
  shops: { name: string; location: string | null; seller_id: string; city: string | null } | null;
  categories: { name: string; icon: string | null } | null;
};

type Category = Tables<"categories">;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" as const } }),
};

const Marche = () => {
  const { addItem } = useCart();
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
          .select("*, shops(name, location, seller_id, city), categories(name, icon)")
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
      farmer: product.shops?.name || "Vendeur",
      shopId: product.shop_id,
    });
  };

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Header */}
        <section className="px-4 md:px-12 py-8 md:py-14 max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-primary font-headline font-extrabold text-xs uppercase tracking-widest">Catalogue</span>
              <h1 className="text-3xl md:text-5xl font-headline font-extrabold tracking-tighter mt-1">Le Marché</h1>
              <p className="text-on-surface-variant text-sm md:text-base mt-2 max-w-lg">
                Découvrez tous les produits frais de nos artisans locaux. Du champ à votre table.
              </p>
            </div>
            <div className="text-sm text-on-surface-variant font-headline font-bold">
              {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface-container-lowest border border-border/30 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-headline font-extrabold uppercase tracking-wide transition-colors ${
                  !selectedCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-headline font-extrabold uppercase tracking-wide transition-colors flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {cat.icon && <span className="material-symbols-outlined text-sm">{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-low rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">search_off</span>
              <p className="font-headline font-bold text-lg mb-2">Aucun produit trouvé</p>
              <p className="text-on-surface-variant text-sm">
                {searchQuery ? "Essayez avec d'autres termes de recherche." : "Aucun produit dans cette catégorie pour le moment."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {filtered.map((product, i) => (
                <Link to={`/produit/${product.id}`} key={product.id}>
                  <motion.div
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="group bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col hover:shadow-xl transition-all h-full border border-border/20"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      {product.image_url ? (
                        <img
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          src={product.image_url}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container">
                          <span className="material-symbols-outlined text-4xl text-on-surface-variant/20">eco</span>
                        </div>
                      )}
                      {product.categories?.name && (
                        <span className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-[10px] font-headline font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                          {product.categories.name}
                        </span>
                      )}
                    </div>
                    <div className="p-3 md:p-5 flex flex-col flex-grow">
                      <h3 className="text-sm md:text-lg font-headline font-extrabold leading-tight">{product.name}</h3>
                      <div className="text-[10px] md:text-xs text-on-surface-variant mt-1">
                        <span className="font-bold text-primary">{product.shops?.name}</span>
                        {product.shops?.city && ` • ${product.shops.city}`}
                      </div>
                      <div className="mt-auto pt-3 flex justify-between items-end">
                        <div>
                          <div className="text-[10px] md:text-xs text-on-surface-variant">{product.unit}</div>
                          <div className="text-base md:text-xl font-headline font-extrabold">{formatPrice(product.price)}</div>
                        </div>
                        <button
                          onClick={(e) => handleAddToCart(product, e)}
                          className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-primary-container flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <span className="material-symbols-outlined text-base md:text-lg">add_shopping_cart</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Marche;
