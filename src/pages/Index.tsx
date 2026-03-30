import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import heroBg from "@/assets/hero-bg.jpg";

type Product = Tables<"products"> & { shops: { name: string; location: string | null; seller_id: string } | null };

const values = [
  {
    icon: "handshake",
    title: "Équité Radicale",
    description: "Nous éliminons les intermédiaires inutiles. Les agriculteurs fixent leurs propres prix, garantissant une rémunération digne et durable pour chaque récolte.",
  },
  {
    icon: "temp_preferences_custom",
    title: "Traçabilité Absolue",
    description: "Chaque produit raconte une histoire. Scannez, découvrez le champ d'origine, la date de semis et le visage de l'artisan qui l'a cultivé.",
  },
  {
    icon: "nutrition",
    title: "Pureté Originelle",
    description: "Zéro pesticide chimique. Nous privilégions les méthodes ancestrales et biologiques pour préserver la santé des sols et la vôtre.",
  },
];

const testimonials = [
  {
    text: "En tant que restauratrice, la qualité des produits est ma priorité. Agrumen me livre des produits d'une fraîcheur incroyable.",
    name: "Fatou B.",
    role: "Chef de Cuisine",
  },
  {
    text: "Savoir exactement qui a fait pousser mes légumes change tout. L'équité du prix payé au producteur est ce qui m'a convaincu. Une démarche authentique.",
    name: "Moussa D.",
    role: "Ingénieur",
    featured: true,
  },
  {
    text: "L'application est tellement fluide ! Commander mon panier de la semaine prend 2 minutes, et je suis livré directement au bureau.",
    name: "Ousmane S.",
    role: "Client Particulier",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const Index = () => {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("*, shops(name, location, seller_id)")
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
      <main className="pt-24">
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="px-6 md:px-12 py-6 max-w-[1440px] mx-auto">
          <div className="relative rounded-3xl overflow-hidden min-h-[540px] flex items-center">
            {/* Background image */}
            <img
              src={heroBg}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              width={1920}
              height={1024}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(120,40%,8%)]/90 via-[hsl(120,40%,8%)]/70 to-transparent" />

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 px-8 md:px-14 w-full md:w-3/5 py-16"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary-container text-primary-container-foreground font-headline font-extrabold text-[10px] uppercase tracking-widest mb-6">
                Cassement Digital
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-[4.2rem] font-headline font-extrabold text-surface tracking-tighter leading-[1] mb-6">
                Cultiver l'âme<br />de nos terroirs.
              </h1>
              <p className="text-base md:text-lg text-surface/70 font-body max-w-md leading-relaxed mb-8">
                Une connexion directe et transparente entre les foyers sénégalais et les gardiens de notre terre. Des produits purs, une équité radicale, livrés du champ à votre table.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/auth" className="bg-primary-container text-primary-container-foreground px-7 py-3.5 rounded-full font-headline font-extrabold text-sm flex items-center gap-2 hover:scale-95 transition-transform shadow-lg">
                  Découvrir le Marché
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link to="/devenir-producteur" className="bg-surface/10 backdrop-blur-md text-surface border border-surface/20 px-7 py-3.5 rounded-full font-headline font-extrabold text-sm hover:bg-surface/20 transition-all">
                  Notre Vision
                </Link>
              </div>
            </motion.div>

            {/* Floating cards on right */}
            <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 flex-col gap-3 z-10">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="bg-surface/15 backdrop-blur-md rounded-2xl p-4 w-52"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-container-foreground text-sm">person</span>
                  </div>
                  <div>
                    <div className="text-surface text-xs font-bold">Vendeur Certifié</div>
                    <div className="text-surface/60 text-[10px]">Niayes, Sénégal</div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="bg-primary-container rounded-2xl p-4 w-52 ml-6"
              >
                <div className="text-primary-container-foreground text-[10px] font-bold uppercase tracking-wider mb-1">+200 Vendeurs</div>
                <div className="text-primary-container-foreground/80 text-[10px]">Réseau d'agriculteurs vérifiés à travers le Sénégal</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="bg-surface/15 backdrop-blur-md rounded-2xl p-4 w-52"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-lg">local_shipping</span>
                  <div className="text-surface text-xs">Impact direct sur le commerce rural de Thiès.</div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════ VALUES ═══════════════ */}
        <section className="py-20 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter">L'Art de Bien Faire</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="group"
              >
                <div className="mb-6 w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary-container transition-colors duration-300">
                  <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">{value.icon}</span>
                </div>
                <h3 className="text-xl font-headline font-extrabold mb-3">{value.title}</h3>
                <p className="text-on-surface-variant font-body leading-relaxed text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════════════ PRODUCTS ═══════════════ */}
        <section className="py-20 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <span className="text-on-surface-variant font-headline font-extrabold text-[10px] uppercase tracking-[0.2em]">Catalogue Premium</span>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mt-1">La Sélection Saisonnière</h2>
            </div>
            <Link to="/" className="text-sm font-headline font-bold text-on-surface-variant hover:text-foreground flex items-center gap-1">
              Tout le Marché <span className="material-symbols-outlined text-base">chevron_right</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-surface-container-low rounded-2xl">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/40 mb-4">storefront</span>
              <p className="font-headline font-bold text-xl mb-2">Aucun produit pour le moment</p>
              <p className="text-on-surface-variant mb-6">Les vendeurs commencent tout juste à ajouter leurs produits.</p>
              <Link to="/devenir-producteur" className="inline-block bg-primary-container text-primary-container-foreground px-8 py-3 rounded-full font-headline font-bold hover:scale-95 transition-transform">
                Devenir vendeur
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product, i) => (
                <Link to={`/produit/${product.id}`} key={product.id}>
                  <motion.div
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="group bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-500 h-full"
                  >
                    <div className="relative h-56 overflow-hidden bg-surface-container">
                      {product.image_url ? (
                        <img alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={product.image_url} loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">eco</span>
                        </div>
                      )}
                      {product.shops?.location && (
                        <div className="absolute top-3 left-3 bg-primary-container/90 backdrop-blur-sm text-primary-container-foreground text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {product.shops.location}
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="text-base font-headline font-extrabold">{product.name}</h3>
                      <div className="text-[11px] text-on-surface-variant font-body mt-0.5">
                        <span className="font-bold text-primary">{product.shops?.name}</span>
                        {product.shops?.location && ` • ${product.shops.location}`}
                      </div>
                      <div className="mt-auto pt-4 flex justify-between items-end">
                        <div>
                          <div className="text-[11px] text-on-surface-variant">{product.unit}</div>
                          <div className="text-lg font-headline font-extrabold">{formatPrice(product.price)}</div>
                        </div>
                        <button
                          onClick={(e) => handleAddToCart(product, e)}
                          className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-primary-container transition-colors"
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

        {/* ═══════════════ SELLER CTA ═══════════════ */}
        <section className="py-20 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="bg-inverse-surface rounded-3xl p-8 md:p-14 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-surface">
              <h2 className="text-3xl md:text-5xl font-headline font-extrabold tracking-tighter mb-6 leading-[1.05]">
                Vous Cultivez.<br />Nous Vous<br />Connectons.
              </h2>
              <p className="text-sm text-inverse-on-surface mb-8 leading-relaxed max-w-md">
                Devenez un Artisan Agrumen et accédez à une plateforme qui valorise votre savoir-faire. Bénéficiez d'outils de logistique, de prévisions de prix et de paiements instantanés.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary-container text-xl">verified</span>
                  <div>
                    <div className="font-headline font-extrabold text-sm">Revenu Garanti</div>
                    <div className="text-[11px] text-inverse-on-surface">Prix stables basés sur la qualité, pas la spéculation.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary-container text-xl">local_shipping</span>
                  <div>
                    <div className="font-headline font-extrabold text-sm">Logistique Intégrée</div>
                    <div className="text-[11px] text-inverse-on-surface">Collecte directe à la ferme par notre réseau.</div>
                  </div>
                </div>
              </div>
              <Link
                to="/devenir-producteur"
                className="inline-block bg-primary-container text-primary-container-foreground px-8 py-4 rounded-full font-headline font-extrabold text-sm hover:scale-95 transition-transform"
              >
                Devenir Partenaire
              </Link>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-inverse-on-surface/10 flex items-center justify-center">
                <div className="text-center p-8">
                  <span className="material-symbols-outlined text-primary-container text-[72px] mb-3">agriculture</span>
                  <p className="text-surface font-headline font-extrabold text-xl">Vendez vos récoltes</p>
                  <p className="text-inverse-on-surface text-sm mt-1">Directement aux consommateurs</p>
                  <div className="mt-4 inline-block bg-primary-container/20 text-primary-container px-4 py-2 rounded-full text-xs font-bold">
                    850 FCFA / kg en moyenne
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ TESTIMONIALS ═══════════════ */}
        <section className="py-20 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="text-center mb-14">
            <span className="text-on-surface-variant font-headline font-extrabold text-[10px] uppercase tracking-[0.2em]">Histoires de Terroir</span>
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mt-2">Ils changent leur table.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`p-8 rounded-2xl flex flex-col ${
                  t.featured
                    ? "bg-inverse-surface text-surface shadow-2xl relative z-10 md:scale-105"
                    : "bg-surface-container-lowest shadow-sm"
                }`}
              >
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <span
                      key={j}
                      className={`material-symbols-outlined filled text-lg ${t.featured ? "text-primary-container" : "text-primary"}`}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className={`text-sm font-body italic leading-relaxed mb-8 flex-grow ${t.featured ? "text-inverse-on-surface" : "text-on-surface-variant"}`}>
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-headline font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className={`font-headline font-extrabold text-sm ${t.featured ? "text-surface" : ""}`}>{t.name}</div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${t.featured ? "text-inverse-on-surface" : "text-on-surface-variant"}`}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════════════ CTA ═══════════════ */}
        <section className="py-20 px-6 md:px-12 max-w-[1440px] mx-auto text-center">
          <div className="bg-primary-container rounded-3xl p-14 md:p-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full -mr-40 -mt-40" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-tertiary/10 rounded-full -ml-28 -mb-28" />
            <h2 className="text-4xl md:text-6xl font-headline font-extrabold text-primary-container-foreground tracking-tighter mb-6 relative z-10 leading-[1.05]">
              Mangez Local.<br />Soutenez nos Héros.
            </h2>
            <p className="text-base text-primary-container-foreground/80 font-body max-w-xl mx-auto mb-10 relative z-10">
              Rejoignez des milliers de Sénégalais qui font le choix de la qualité, de la fraîcheur et de la justice sociale.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Link to="/auth" className="bg-inverse-surface text-surface px-10 py-4 rounded-full font-headline font-extrabold text-base shadow-2xl hover:scale-105 transition-transform">
                Démarrer mes Achats
              </Link>
              <button className="border-2 border-primary-container-foreground/30 text-primary-container-foreground px-10 py-4 rounded-full font-headline font-bold text-base hover:bg-primary-container-foreground/10 transition-all">
                App Store & Play Store
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
