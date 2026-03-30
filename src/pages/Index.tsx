import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products"> & { shops: { name: string; location: string | null; seller_id: string } | null };

const values = [
  {
    icon: "handshake",
    title: "Équité Radicale",
    description: "Nous éliminons les intermédiaires inutiles. Les agriculteurs fixent leurs propres prix, garantissant une rémunération digne et durable pour chaque récolte.",
  },
  {
    icon: "qr_code_scanner",
    title: "Traçabilité Absolue",
    description: "Chaque produit raconte une histoire. Scannez, découvrez le champ d'origine, la date de semis et le visage de l'artisan qui l'a cultivé.",
  },
  {
    icon: "eco",
    title: "Pureté Originelle",
    description: "Zéro pesticide chimique. Nous privilégions les méthodes ancestrales et biologiques pour préserver la santé des sols et la vôtre.",
  },
];

const testimonials = [
  {
    text: "En tant que restauratrice, la qualité des produits est ma priorité. Agrumen me livre des produits d'une fraîcheur incroyable que je ne trouvais nulle part ailleurs à Dakar.",
    name: "Fatou B.",
    role: "Chef de Cuisine",
    featured: false,
  },
  {
    text: "Savoir exactement qui a fait pousser mes légumes change tout. L'équité du prix payé au producteur est ce qui m'a convaincu. Une démarche authentique.",
    name: "Moussa D.",
    role: "Ingénieur",
    featured: true,
  },
  {
    text: "L'application est tellement fluide ! Commander mon panier de la semaine prend 2 minutes, et je suis livré directement au bureau le lendemain.",
    name: "Ousmane S.",
    role: "Client Particulier",
    featured: false,
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
      .limit(8)
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
        {/* Hero Section */}
        <section className="px-6 md:px-12 py-8 max-w-[1440px] mx-auto overflow-hidden">
          <div className="relative rounded-3xl overflow-hidden bg-primary min-h-[550px] flex items-center">
            <div className="absolute inset-0 z-0">
              <img
                alt="Agriculture au Sénégal"
                className="w-full h-full object-cover opacity-30"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoBJes82HWZeaoia4V0RuCQz1eG93U7vBumVQuOkIbkOYZ4OyPx7k6XuONUUj1skMw58FLDaOhu_rbGMvQE9A7TExBkF7LN9kEqRrnvJHxX71HtF6OBof2MxE9_ZmcqR76pr9RSigi4rY6wfQdd06Xo1ElTCGPU99TWzESAHJWGXg2jPwuRj5UOXJo_K-gz8-kkCf9hbXtqLNSkJTTOV1nhmxK3FwAEpEbXmXow9wN2RrjiX2Y9NN4NfCmsqYTFN8Mlp58D4y4aw6_"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 px-8 md:px-16 w-full md:w-2/3 py-16"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary-container text-primary-container-foreground font-headline font-bold text-xs uppercase tracking-widest mb-6">
                Agronomie Digitale
              </span>
              <h1 className="text-4xl md:text-6xl font-headline font-extrabold text-primary-foreground tracking-tighter leading-[1] mb-6">
                Cultiver l'âme de nos terroirs.
              </h1>
              <p className="text-lg text-primary-foreground/80 font-body max-w-lg leading-relaxed mb-10">
                Une connexion directe et transparente entre les foyers sénégalais et les gardiens de notre terre. Des produits purs, une équité radicale, livrés du champ à votre table.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth" className="bg-primary-container text-primary-container-foreground px-8 py-4 rounded-full font-headline font-bold text-base flex items-center gap-2 hover:scale-95 transition-transform">
                  Découvrir le Marché
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link to="/devenir-producteur" className="bg-surface/20 backdrop-blur-md text-primary-foreground px-8 py-4 rounded-full font-headline font-bold text-base hover:bg-surface/30 transition-all">
                  Notre Vision
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Values / L'Art de Bien Faire */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter">L'Art de Bien Faire</h2>
            <div className="w-12 h-1 bg-primary-container mx-auto mt-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center group"
              >
                <div className="mb-6 w-14 h-14 rounded-2xl bg-surface-container-low mx-auto flex items-center justify-center group-hover:bg-primary-container transition-colors duration-300">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant group-hover:text-primary-container-foreground transition-colors">{value.icon}</span>
                </div>
                <h3 className="text-xl font-headline font-extrabold mb-3">{value.title}</h3>
                <p className="text-on-surface-variant font-body text-sm leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Products / La Sélection Saisonnière */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="text-primary font-headline font-bold text-xs uppercase tracking-[0.2em]">Catalogue Premium</span>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mt-2">La Sélection Saisonnière</h2>
            </div>
            <Link to="/" className="text-sm font-headline font-bold text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors">
              Tout le Marché
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
              <p className="text-on-surface-variant mt-4">Chargement des produits...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-surface-container-lowest rounded-3xl">
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
                    className="group bg-surface-container-lowest rounded-3xl overflow-hidden flex flex-col hover:shadow-lg transition-all duration-500 h-full"
                  >
                    <div className="relative h-56 overflow-hidden bg-surface-container flex items-center justify-center p-6">
                      {product.image_url ? (
                        <img alt={product.name} className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-700" src={product.image_url} />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-surface-container-high flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">eco</span>
                        </div>
                      )}
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase">Stock limité</span>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="text-base font-headline font-extrabold">{product.name}</h3>
                      <div className="text-xs text-on-surface-variant font-body mt-1">
                        <span className="text-primary font-bold">{product.shops?.name}</span>
                        {product.shops?.location && ` • ${product.shops.location}`}
                      </div>
                      <div className="mt-auto pt-4 flex justify-between items-end">
                        <div>
                          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">{product.unit}</div>
                          <div className="text-xl font-headline font-extrabold">{formatPrice(product.price)}</div>
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

        {/* Seller CTA - Dark section */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto overflow-hidden">
          <div className="bg-inverse-surface rounded-3xl p-10 md:p-16 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-surface">
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mb-6 leading-tight">
                Nous Vous Connectons.
              </h2>
              <p className="text-base text-inverse-on-surface mb-8 leading-relaxed max-w-md">
                Devenez un Artisan Agrumen et accédez à une plateforme qui valorise votre savoir-faire. Bénéficiez d'outils de logistique, de prévisions de prix et de paiements instantanés.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary-container text-xl">trending_up</span>
                  <div>
                    <div className="font-headline font-bold text-sm">Revenu Garanti</div>
                    <div className="text-xs text-inverse-on-surface">Prix stables basés sur la qualité, pas la spéculation.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary-container text-xl">local_shipping</span>
                  <div>
                    <div className="font-headline font-bold text-sm">Logistique Intégrée</div>
                    <div className="text-xs text-inverse-on-surface">Collecte directe à la ferme par notre réseau.</div>
                  </div>
                </div>
              </div>
              <Link
                to="/devenir-producteur"
                className="inline-block bg-primary-container text-primary-container-foreground px-8 py-4 rounded-full font-headline font-bold text-base hover:scale-95 transition-transform"
              >
                Devenir Partenaire
              </Link>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden">
                <img
                  alt="Vendeur Agrumen"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB767-96WqPQEG_urSqrAvXwpsSdTT5CnrY3tb-jo-WUUS76j8-usg5gpsPNuMoe9CjEYlwI1q1_LUt6A0GGU6Be1Ma_IlFiw12H692fG4KLCmE3aWvX8e1Emc5OnNj8s2kOCvpasqjGlnVoyUm8wBc5mbsCK6Po_ZgAGjewsJSGsVB9kQoRoEX4gsU5GEVvjPPZmuLZp4bfutS1M_IdYnBt5Z6GgCuOnJ5YyCOsc0F6ATntbAspcSSTy7LWBOP-WS5wqvfz7s7PAJx"
                />
              </div>
              <div className="absolute bottom-4 right-4 bg-primary-container text-primary-container-foreground px-5 py-3 rounded-2xl font-headline font-extrabold text-sm">
                850k FCFA
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <span className="text-on-surface-variant font-headline font-bold text-xs uppercase tracking-[0.2em]">Histoires de Terroir</span>
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
                className={`p-8 rounded-3xl flex flex-col ${
                  t.featured
                    ? "bg-inverse-surface text-surface shadow-2xl relative z-10 md:scale-105"
                    : "bg-surface-container-lowest"
                }`}
              >
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className={`material-symbols-outlined filled text-base ${t.featured ? "text-primary-container" : "text-primary"}`}>star</span>
                  ))}
                </div>
                <p className={`text-sm font-body italic leading-relaxed mb-8 flex-grow ${t.featured ? "text-inverse-on-surface" : "text-on-surface-variant"}`}>
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-headline font-bold text-sm ${t.featured ? "bg-surface text-foreground" : "bg-surface-container text-foreground"}`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className={`font-headline font-bold text-sm ${t.featured ? "text-surface" : ""}`}>{t.name}</div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${t.featured ? "text-inverse-on-surface" : "text-on-surface-variant"}`}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="bg-primary-container rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
            <h2 className="text-4xl md:text-6xl font-headline font-extrabold text-primary-container-foreground tracking-tighter mb-6 relative z-10 leading-tight">
              Mangez Local.<br />Soutenez nos Héros.
            </h2>
            <p className="text-base text-primary-container-foreground/80 font-body max-w-xl mx-auto mb-10 relative z-10">
              Rejoignez des milliers de Sénégalais qui font le choix de la qualité, de la fraîcheur et de la justice sociale.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Link to="/auth" className="bg-primary text-primary-foreground px-10 py-4 rounded-full font-headline font-bold text-base hover:scale-95 transition-transform">
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
