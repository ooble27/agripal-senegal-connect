import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import fruitsPromo from "@/assets/fruits-promo.png";
import ProductCard from "@/components/ProductCard";

type Product = Tables<"products"> & {
  shops: { name: string; seller_id: string } | null;
  categories: { name: string; icon: string | null } | null;
};

type Category = Tables<"categories">;

/* ═══════ MOCK DATA for preview ═══════ */
const MOCK_CATEGORIES: Category[] = [
  { id: "cat-fruits", name: "Fruits", icon: "nutrition", created_at: "" },
  { id: "cat-legumes", name: "Légumes", icon: "eco", created_at: "" },
  { id: "cat-cereales", name: "Céréales", icon: "grain", created_at: "" },
  { id: "cat-tubercules", name: "Tubercules", icon: "spa", created_at: "" },
  { id: "cat-epices", name: "Épices", icon: "local_fire_department", created_at: "" },
];

const mockProduct = (id: string, name: string, price: number, unit: string, catId: string, img: string): Product => ({
  id, name, price, unit, category_id: catId, shop_id: "mock-shop",
  image_url: img, description: "", stock: 50, is_active: true,
  created_at: "", updated_at: "",
  shops: { name: "Ferme Bio Dakar", seller_id: "mock-seller" },
  categories: MOCK_CATEGORIES.find(c => c.id === catId) ? { name: MOCK_CATEGORIES.find(c => c.id === catId)!.name, icon: MOCK_CATEGORIES.find(c => c.id === catId)!.icon } : null,
});

const MOCK_PRODUCTS: Product[] = [
  mockProduct("m1", "Banane Plantain", 500, "le kg", "cat-fruits", "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop"),
  mockProduct("m2", "Oranges", 700, "le kg", "cat-fruits", "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=400&fit=crop"),
  mockProduct("m3", "Mangues Kent", 1500, "le kg", "cat-fruits", "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=400&fit=crop"),
  mockProduct("m4", "Papaye", 800, "la pièce", "cat-fruits", "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400&h=400&fit=crop"),
  mockProduct("m5", "Pastèque", 2000, "la pièce", "cat-fruits", "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=400&h=400&fit=crop"),
  mockProduct("m6", "Pomme Verte", 1000, "le kg", "cat-fruits", "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop"),
  mockProduct("m7", "Ananas", 1200, "la pièce", "cat-fruits", "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400&h=400&fit=crop"),
  mockProduct("m8", "Citron Vert", 300, "le kg", "cat-fruits", "https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=400&fit=crop"),
  mockProduct("m11", "Oignons", 350, "le kg", "cat-legumes", "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&h=400&fit=crop"),
  mockProduct("m12", "Piment Rouge", 600, "le kg", "cat-legumes", "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400&h=400&fit=crop"),
  mockProduct("m13", "Aubergine", 450, "le kg", "cat-legumes", "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400&h=400&fit=crop"),
  mockProduct("m14", "Gombo", 500, "le kg", "cat-legumes", "https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?w=400&h=400&fit=crop"),
  mockProduct("m15", "Poivron Vert", 550, "le kg", "cat-legumes", "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=400&fit=crop"),
  mockProduct("m16", "Concombre", 300, "le kg", "cat-legumes", "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400&h=400&fit=crop"),
  mockProduct("m17", "Carotte", 400, "le kg", "cat-legumes", "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop"),
  mockProduct("m20", "Riz Brisé", 500, "le kg", "cat-cereales", "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop"),
  mockProduct("m21", "Mil", 400, "le kg", "cat-cereales", "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop"),
  mockProduct("m22", "Maïs", 350, "le kg", "cat-cereales", "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=400&fit=crop"),
  mockProduct("m31", "Igname", 600, "le kg", "cat-tubercules", "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=400&h=400&fit=crop"),
  mockProduct("m41", "Curcuma", 3000, "le kg", "cat-epices", "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=400&fit=crop"),
  mockProduct("m42", "Gingembre", 1500, "le kg", "cat-epices", "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=400&fit=crop"),
];

const Marche = () => {
  const { addItem } = useCart();
  const { user, profile } = useAuth();
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
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
      if (prodRes.data) setDbProducts(prodRes.data as Product[]);
      if (catRes.data) setDbCategories(catRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Merge DB products with mock products (mock IDs start with "m")
  const products = useMemo(() => {
    const dbIds = new Set(dbProducts.map(p => p.id));
    // Only add mock products that don't conflict
    const mocks = MOCK_PRODUCTS.filter(m => !dbIds.has(m.id));
    return [...dbProducts, ...mocks];
  }, [dbProducts]);

  const categories = useMemo(() => {
    if (dbCategories.length > 0) {
      // Merge mock categories not already in DB
      const dbNames = new Set(dbCategories.map(c => c.name.toLowerCase()));
      const extra = MOCK_CATEGORIES.filter(mc => !dbNames.has(mc.name.toLowerCase()));
      return [...dbCategories, ...extra];
    }
    return MOCK_CATEGORIES;
  }, [dbCategories]);

  const filtered = products.filter((p) => {
    const matchCat = !selectedCategory || p.category_id === selectedCategory;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.id.startsWith("m")) return; // mock product, don't add
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
      <main className="pt-28 md:pt-24">

        {/* ═══════ HEADER — all screens ═══════ */}
        <section className="px-5 md:px-12 pt-3 md:pt-6 max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg md:text-2xl font-headline font-extrabold tracking-tight">
                Salut{user ? `, ${firstName}` : ""} 👋
              </p>
              <p className="text-xs md:text-sm text-on-surface-variant">Qu'est-ce qu'on cuisine aujourd'hui ?</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-sm text-on-surface-variant font-headline font-bold">
                {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
              </span>
              <button className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">notifications</span>
              </button>
            </div>
          </div>

          {/* Search */}
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

        {/* ═══════ PROMO BANNER — all screens ═══════ */}
        <section className="px-5 md:px-12 mt-4 max-w-[1440px] mx-auto">
          <div className="relative bg-primary rounded-2xl p-5 md:p-8 flex items-center overflow-hidden">
            <div className="flex-1 relative z-10">
              <span className="inline-block bg-primary-container text-primary-container-foreground text-[10px] md:text-xs font-bold uppercase px-2.5 py-1 rounded-lg mb-2">
                Nouveau 🌿
              </span>
              <h3 className="text-surface-container-lowest font-headline font-extrabold text-lg md:text-2xl leading-tight mb-1">
                Produits Frais<br />Chaque Jour
              </h3>
              <Link
                to="/marche"
                className="inline-block bg-surface-container-lowest text-primary text-xs md:text-sm font-bold px-4 py-2 rounded-lg mt-2"
              >
                Voir tout
              </Link>
            </div>
            <img src={fruitsPromo} alt="Fruits frais" className="w-36 md:w-48 h-36 md:h-48 object-contain -mr-4 -mb-6 -mt-4 relative z-10" />
          </div>
        </section>

        {/* ═══════ CATEGORIES ═══════ */}
        <section className="px-5 md:px-12 mt-4 md:mb-6 max-w-[1440px] mx-auto">
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
            <div className="px-5 md:px-12 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square rounded-xl bg-surface-container mb-2" />
                  <div className="h-4 bg-surface-container rounded-lg w-3/4 mb-1.5" />
                  <div className="h-3 bg-surface-container rounded-lg w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 mx-5">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">search_off</span>
              <p className="font-headline font-bold text-lg mb-2">Aucun produit trouvé</p>
              <p className="text-on-surface-variant text-sm">
                {searchQuery ? "Essayez avec d'autres termes." : "Aucun produit dans cette catégorie."}
              </p>
            </div>
          ) : (
            /* All products grid - always show flat grid */
            <div className="px-5 md:px-12 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} formatPrice={formatPrice} index={i} />
              ))}
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

export default Marche;
