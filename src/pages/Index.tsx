import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products"> & { shops: { name: string; location: string | null; seller_id: string; city: string | null } | null };

const testimonials = [
  {
    text: "En tant que restauratrice, la qualité des produits est ma priorité. Agrumen me livre des produits d'une fraîcheur incroyable que je ne trouvais nulle part ailleurs à Dakar.",
    name: "Fatou B.",
    role: "Chef de Cuisine",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAnmXh2GQDR1vo_aqRRGxfOsptfazWdGdMh692pUxoUFGNsLkujsk31EynA0kwB8z86ofTckqhz8RutoTeAMCltjMLV6WRACv568h_DbbuzH80yR86mO16lA_GA668wyIlzHmpNQQL5gYKQJpzMoaNvD1J7ensxkfF40VdSCoutAHmUNfUK0XuMRkEx3cHaEyNhgpu0XAQv_eS0HUYI69Azh-RIQ0bco2EQQH1v-2kpCt7hcZWaSxa2nMkOsFTIZEPgLh1QbMz1h33u",
    featured: false,
  },
  {
    text: "Savoir exactement qui a fait pousser mes légumes change tout. L'équité du prix payé au producteur est ce qui m'a convaincu.",
    name: "Moussa D.",
    role: "Ingénieur",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC60RyBev9JTvOrrvaELLgjN6-bWSeoe0NTXeSEaZ172AbX99johkibE5Evy5CrMA1S1bUVwWK4dRjetKBN-5JZuAfxfcMd_ltbeHALhuO03vf0V7AFIyIB1whysyQIN1d9yR9TCLQ70hfJXx9yml5FwVAqyXa29QreeJXFjdEwL7wk9nOt3LUSIEDHzzUHb0Eu2eTPk6aFGyq6zyKZC2XKtgL0995bYLxA9ZKs39LRtb6fnQZ7JDaJ75mO0Sf_6BDA_adMqRLNvV26",
    featured: true,
  },
  {
    text: "L'application est tellement fluide ! Commander mon panier de la semaine prend 2 minutes, et je suis livré directement au bureau le lendemain.",
    name: "Ousmane S.",
    role: "Client Particulier",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD0MkwjxhkmIi_VLCXA5v2nucWG3IIsX2Gfw7jfLRDf8e8GPhXdRgVgW6P3x6Ql-da_BzRL0X39o-tf1YCmUzD_zB_f9f_po4g_Nzngs5-nWopF_NMYa8IiYCNySD_onnHHpfKugCA9Qugfrcp-duG3YJ_9cjigjp-s9q7nJe_DXCpm-_gQ2VER-wApMewZOakOZFX6pMCO2RCGUEagP0DNaYVIiu9lqQY1HOwvT_Rd1TEpaVdQAUxhuU-94s2BfXRGG7TLJ3vcjcwh",
    featured: false,
  },
];

const values = [
  { icon: "handshake", title: "Équité Radicale", description: "Les agriculteurs fixent leurs propres prix. Zéro intermédiaire inutile. Une rémunération digne pour chaque récolte." },
  { icon: "temp_preferences_custom", title: "Traçabilité Absolue", description: "Chaque produit raconte une histoire. Découvrez le champ d'origine, la date de semis et le producteur." },
  { icon: "nutrition", title: "Pureté Originelle", description: "Zéro pesticide chimique. Méthodes ancestrales et biologiques pour préserver la santé des sols et la vôtre." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const } }),
};

const Index = () => {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("*, shops(name, location, seller_id, city)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) setProducts(data as Product[]);
        setLoading(false);
      });
  }, []);

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
        {/* ═══════ HERO ═══════ */}
        <section className="px-4 md:px-12 py-6 md:py-12 max-w-[1440px] mx-auto">
          <div className="relative rounded-2xl md:rounded-xl overflow-hidden bg-surface-container-low min-h-[500px] md:min-h-[700px] flex items-end md:items-center">
            <div className="absolute inset-0 z-0">
              <img
                alt="Agriculture au Sénégal"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoBJes82HWZeaoia4V0RuCQz1eG93U7vBumVQuOkIbkOYZ4OyPx7k6XuONUUj1skMw58FLDaOhu_rbGMvQE9A7TExBkF7LN9kEqRrnvJHxX71HtF6OBof2MxE9_ZmcqR76pr9RSigi4rY6wfQdd06Xo1ElTCGPU99TWzESAHJWGXg2jPwuRj5UOXJo_K-gz8-kkCf9hbXtqLNSkJTTOV1nhmxK3FwAEpEbXmXow9wN2RrjiX2Y9NN4NfCmsqYTFN8Mlp58D4y4aw6_"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-foreground/90 via-foreground/60 to-transparent" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 px-6 md:px-16 pb-10 md:pb-0 w-full md:w-2/3"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary-container text-primary-container-foreground font-headline font-extrabold text-[10px] md:text-xs uppercase tracking-widest mb-4 md:mb-6">
                L'Agronome Digital
              </span>
              <h1 className="text-3xl md:text-7xl lg:text-8xl font-headline font-extrabold text-surface tracking-tighter leading-[0.95] mb-4 md:mb-8">
                Cultiver l'âme de nos terroirs.
              </h1>
              <p className="text-base md:text-xl text-surface/80 font-body max-w-xl leading-relaxed mb-6 md:mb-10">
                Une connexion directe entre les foyers sénégalais et les gardiens de notre terre. Des produits purs, une équité radicale.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/#catalogue" className="bg-primary-container text-primary-container-foreground px-8 py-4 md:px-10 md:py-5 rounded-full font-headline font-extrabold text-base md:text-lg flex items-center justify-center gap-3 hover:scale-95 transition-transform shadow-xl">
                  Découvrir le Marché
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link to="/devenir-producteur" className="bg-surface/10 backdrop-blur-md text-surface border border-surface/20 px-8 py-4 md:px-10 md:py-5 rounded-full font-headline font-extrabold text-base md:text-lg hover:bg-surface hover:text-foreground transition-all text-center">
                  Devenir Vendeur
                </Link>
              </div>
            </motion.div>

            {/* Floating Cards - desktop only */}
            <div className="absolute right-8 bottom-8 hidden lg:flex flex-col gap-4 w-72 z-10">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="bg-surface-container-lowest/90 backdrop-blur-xl p-5 rounded-xl shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary-container/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">eco</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Origine Certifiée</div>
                    <div className="text-sm font-headline font-extrabold">Niayes, Sénégal</div>
                  </div>
                </div>
                <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-3/4" />
                </div>
                <div className="mt-1.5 text-[10px] text-on-surface-variant">Récolté il y a 6 heures</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="bg-primary text-primary-foreground p-5 rounded-xl shadow-2xl"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="material-symbols-outlined text-3xl">payments</span>
                  <span className="text-xs font-headline font-bold uppercase">+12% Revenu</span>
                </div>
                <div className="text-sm font-body opacity-90">Impact direct sur la communauté rurale.</div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════ VALUES ═══════ */}
        <section className="py-16 md:py-24 px-4 md:px-12 max-w-[1440px] mx-auto">
          <div className="mb-10 md:mb-16">
            <h2 className="text-3xl md:text-6xl font-headline font-extrabold tracking-tighter mb-3">L'Art de Bien Faire</h2>
            <div className="h-1 w-20 md:w-32 bg-primary-container" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {values.map((value, i) => (
              <motion.div key={value.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="group">
                <div className="mb-6 w-14 h-14 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary-container transition-colors">
                  <span className="material-symbols-outlined text-2xl">{value.icon}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-headline font-extrabold mb-3">{value.title}</h3>
                <p className="text-on-surface-variant font-body leading-relaxed text-sm md:text-base">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ PRODUCTS CATALOGUE ═══════ */}
        <section id="catalogue" className="py-16 md:py-24 px-4 md:px-12 max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-4">
            <div>
              <span className="text-primary font-headline font-extrabold text-xs uppercase tracking-widest">Catalogue</span>
              <h2 className="text-3xl md:text-6xl font-headline font-extrabold tracking-tighter mt-1">La Sélection Saisonnière</h2>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-low rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">storefront</span>
              <p className="font-headline font-bold text-lg mb-2">Aucun produit pour le moment</p>
              <p className="text-on-surface-variant text-sm mb-6">Les vendeurs commencent à ajouter leurs produits.</p>
              <Link to="/devenir-producteur" className="inline-block bg-primary-container text-primary-container-foreground px-6 py-3 rounded-full font-headline font-bold text-sm hover:scale-95 transition-transform">
                Devenir vendeur
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
              {products.map((product, i) => (
                <Link to={`/produit/${product.id}`} key={product.id}>
                  <motion.div custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="group bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col hover:shadow-xl transition-all h-full border border-border/20">
                    <div className="relative h-52 md:h-64 overflow-hidden">
                      {product.image_url ? (
                        <img alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={product.image_url} loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container">
                          <span className="material-symbols-outlined text-5xl text-on-surface-variant/20">eco</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="text-lg font-headline font-extrabold">{product.name}</h3>
                      <div className="text-xs text-on-surface-variant mt-1">
                        <span className="font-bold text-primary">{product.shops?.name}</span>
                        {product.shops?.city && ` • ${product.shops.city}`}
                      </div>
                      <div className="mt-auto pt-4 flex justify-between items-end">
                        <div>
                          <div className="text-xs text-on-surface-variant">{product.unit}</div>
                          <div className="text-xl font-headline font-extrabold">{formatPrice(product.price)}</div>
                        </div>
                        <button
                          onClick={(e) => handleAddToCart(product, e)}
                          className="w-11 h-11 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-primary-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ═══════ SELLER CTA ═══════ */}
        <section className="py-16 md:py-24 px-4 md:px-12 max-w-[1440px] mx-auto">
          <div className="bg-inverse-surface rounded-2xl md:rounded-xl p-8 md:p-16 lg:p-20 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <div className="flex-1 text-surface">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-headline font-extrabold tracking-tighter mb-6">
                Vous Cultivez.<br />Nous Vous Connectons.
              </h2>
              <p className="text-base md:text-lg text-inverse-on-surface mb-8 leading-relaxed max-w-lg">
                Devenez un Artisan Agrumen. Bénéficiez d'outils de logistique, de prévisions de prix et de paiements instantanés via Wave et Orange Money.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary-container text-xl">trending_up</span>
                  <div>
                    <div className="font-headline font-extrabold">Revenu Garanti</div>
                    <div className="text-sm text-inverse-on-surface">Prix stables basés sur la qualité.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary-container text-xl">inventory</span>
                  <div>
                    <div className="font-headline font-extrabold">Logistique Intégrée</div>
                    <div className="text-sm text-inverse-on-surface">Collecte directe à la ferme.</div>
                  </div>
                </div>
              </div>
              <Link to="/devenir-producteur" className="inline-block bg-primary-container text-primary-container-foreground px-8 py-4 rounded-full font-headline font-extrabold text-base md:text-lg hover:scale-95 transition-transform">
                Devenir Partenaire
              </Link>
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden">
                <img
                  alt="Artisan Farmer"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB767-96WqPQEG_urSqrAvXwpsSdTT5CnrY3tb-jo-WUUS76j8-usg5gpsPNuMoe9CjEYlwI1q1_LUt6A0GGU6Be1Ma_IlFiw12H692fG4KLCmE3aWvX8e1Emc5OnNj8s2kOCvpasqjGlnVoyUm8wBc5mbsCK6Po_ZgAGjewsJSGsVB9kQoRoEX4gsU5GEVvjPPZmuLZp4bfutS1M_IdYnBt5Z6GgCuOnJ5YyCOsc0F6ATntbAspcSSTy7LWBOP-WS5wqvfz7s7PAJx"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ TESTIMONIALS ═══════ */}
        <section className="py-16 md:py-24 px-4 md:px-12 max-w-[1440px] mx-auto bg-surface-container-low rounded-t-[2rem] md:rounded-t-[4rem]">
          <div className="text-center mb-12 md:mb-20">
            <span className="text-primary font-headline font-extrabold text-xs uppercase tracking-widest">Histoires de Terroir</span>
            <h2 className="text-3xl md:text-6xl font-headline font-extrabold tracking-tighter mt-2">Ils changent leur table.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`p-8 md:p-10 rounded-2xl flex flex-col ${
                  t.featured
                    ? "bg-inverse-surface text-surface md:scale-105 shadow-2xl relative z-10"
                    : "bg-surface-container-lowest shadow-sm"
                }`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className={`material-symbols-outlined filled text-sm ${t.featured ? "text-primary-container" : "text-primary"}`}>star</span>
                  ))}
                </div>
                <p className={`text-base md:text-lg font-body italic leading-relaxed mb-8 ${t.featured ? "text-inverse-on-surface" : "text-on-surface-variant"}`}>
                  "{t.text}"
                </p>
                <div className="mt-auto flex items-center gap-3">
                  <img alt={t.name} className="w-12 h-12 rounded-full object-cover" src={t.image} loading="lazy" />
                  <div>
                    <div className={`font-headline font-extrabold text-sm ${t.featured ? "text-surface" : ""}`}>{t.name}</div>
                    <div className={`text-xs uppercase font-bold ${t.featured ? "text-inverse-on-surface" : "text-on-surface-variant"}`}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ FINAL CTA ═══════ */}
        <section className="py-16 md:py-24 px-4 md:px-12 max-w-[1440px] mx-auto text-center">
          <div className="bg-primary-container rounded-2xl md:rounded-xl p-10 md:p-24 lg:p-32 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-48 h-48 border-4 border-primary-container-foreground rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-72 h-72 border-4 border-primary-container-foreground rounded-full translate-x-1/2 translate-y-1/2" />
            </div>
            <h2 className="text-3xl md:text-6xl lg:text-8xl font-headline font-extrabold text-primary-container-foreground tracking-tighter mb-6 relative z-10">
              Mangez Local.<br />Soutenez nos Héros.
            </h2>
            <p className="text-base md:text-xl text-primary-container-foreground/80 font-body max-w-2xl mx-auto mb-8 md:mb-12 relative z-10">
              Rejoignez des milliers de Sénégalais qui font le choix de la qualité, de la fraîcheur et de la justice sociale.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Link to="/auth" className="bg-inverse-surface text-surface px-8 py-5 md:px-12 md:py-6 rounded-full font-headline font-extrabold text-lg md:text-xl shadow-2xl hover:scale-105 transition-transform">
                Démarrer mes Achats
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
