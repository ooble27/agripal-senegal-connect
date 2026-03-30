import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products"> & { shops: { name: string; location: string | null; seller_id: string } | null };

const testimonials = [
  {
    text: "En tant que restauratrice, la qualité des produits est ma priorité. Agrumen me livre des produits d'une fraîcheur incroyable.",
    name: "Fatou B.",
    role: "Chef de Cuisine",
    featured: false,
  },
  {
    text: "Savoir exactement qui a fait pousser mes légumes change tout. L'équité du prix payé au producteur est ce qui m'a convaincu.",
    name: "Moussa D.",
    role: "Ingénieur",
    featured: true,
  },
  {
    text: "L'application est tellement fluide ! Commander mon panier de la semaine prend 2 minutes, et je suis livré directement au bureau.",
    name: "Ousmane S.",
    role: "Client Particulier",
    featured: false,
  },
];

const values = [
  {
    icon: "handshake",
    title: "Équité Radicale",
    description: "Les agriculteurs fixent leurs propres prix. Agrumen encaisse, puis paye le vendeur après validation de la commande.",
  },
  {
    icon: "temp_preferences_custom",
    title: "Traçabilité",
    description: "Chaque produit est lié à un vendeur vérifié. Vous savez exactement d'où viennent vos achats.",
  },
  {
    icon: "nutrition",
    title: "Fraîcheur Garantie",
    description: "Produits locaux du Sénégal, vendus directement par les producteurs et livrés rapidement à Dakar.",
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
        <section className="px-6 md:px-12 py-12 max-w-[1440px] mx-auto overflow-hidden">
          <div className="relative rounded-xl overflow-hidden bg-surface-container-low min-h-[600px] flex items-center">
            <div className="absolute inset-0 z-0">
              <img
                alt="Agriculture au Sénégal"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoBJes82HWZeaoia4V0RuCQz1eG93U7vBumVQuOkIbkOYZ4OyPx7k6XuONUUj1skMw58FLDaOhu_rbGMvQE9A7TExBkF7LN9kEqRrnvJHxX71HtF6OBof2MxE9_ZmcqR76pr9RSigi4rY6wfQdd06Xo1ElTCGPU99TWzESAHJWGXg2jPwuRj5UOXJo_K-gz8-kkCf9hbXtqLNSkJTTOV1nhmxK3FwAEpEbXmXow9wN2RrjiX2Y9NN4NfCmsqYTFN8Mlp58D4y4aw6_"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/40 to-transparent" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 px-8 md:px-16 w-full md:w-2/3"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary-container text-primary-container-foreground font-headline font-extrabold text-xs uppercase tracking-widest mb-6">
                Marketplace Agricole du Sénégal
              </span>
              <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-surface tracking-tighter leading-[0.9] mb-8">
                Achetez directement aux producteurs sénégalais.
              </h1>
              <p className="text-xl text-surface-container-highest font-body max-w-xl leading-relaxed mb-10">
                Agrumen connecte acheteurs et vendeurs. Produits frais, prix justes, paiement sécurisé via Wave et Orange Money.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth" className="bg-primary-container text-primary-container-foreground px-10 py-5 rounded-full font-headline font-extrabold text-lg flex items-center gap-3 hover:scale-95 transition-transform shadow-xl">
                  Créer un compte
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link to="/devenir-producteur" className="bg-surface/10 backdrop-blur-md text-surface border border-surface/20 px-10 py-5 rounded-full font-headline font-extrabold text-lg hover:bg-surface hover:text-foreground transition-all">
                  Vendre sur Agrumen
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tighter mb-4">Comment ça marche</h2>
            <div className="h-1.5 w-32 bg-primary-container" />
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
                className="group"
              >
                <div className="mb-8 w-16 h-16 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary-container transition-colors duration-300">
                  <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">{value.icon}</span>
                </div>
                <h3 className="text-2xl font-headline font-extrabold mb-4">{value.title}</h3>
                <p className="text-on-surface-variant font-body leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Products Section */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <span className="text-primary font-headline font-extrabold text-sm uppercase tracking-widest">Catalogue</span>
              <h2 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tighter mt-2">Produits disponibles</h2>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
              <p className="text-on-surface-variant mt-4">Chargement des produits...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/40 mb-4">storefront</span>
              <p className="font-headline font-bold text-xl mb-2">Aucun produit pour le moment</p>
              <p className="text-on-surface-variant mb-6">Les vendeurs commencent tout juste à ajouter leurs produits.</p>
              <Link to="/devenir-producteur" className="inline-block bg-primary-container text-primary-container-foreground px-8 py-3 rounded-full font-headline font-bold hover:scale-95 transition-transform">
                Devenir vendeur
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product, i) => (
                <Link to={`/produit/${product.id}`} key={product.id}>
                  <motion.div
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="group bg-surface-container-lowest rounded-lg overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-500 h-full"
                  >
                    <div className="relative h-64 overflow-hidden bg-surface-container">
                      {product.image_url ? (
                        <img alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={product.image_url} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">eco</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-headline font-extrabold">{product.name}</h3>
                      <div className="text-xs text-on-surface-variant font-body mt-1">
                        <span className="font-bold text-primary">{product.shops?.name}</span>
                        {product.shops?.location && ` • ${product.shops.location}`}
                      </div>
                      <div className="mt-auto pt-6 flex justify-between items-end">
                        <div>
                          <div className="text-sm text-on-surface-variant">{product.unit}</div>
                          <div className="text-2xl font-headline font-extrabold">{formatPrice(product.price)}</div>
                        </div>
                        <button
                          onClick={(e) => handleAddToCart(product, e)}
                          className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-primary-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Seller CTA */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto overflow-hidden">
          <div className="bg-inverse-surface rounded-xl p-8 md:p-20 flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-surface">
              <h2 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tighter mb-8">
                Vous êtes vendeur ?<br />Rejoignez Agrumen.
              </h2>
              <p className="text-lg text-inverse-on-surface mb-12 leading-relaxed max-w-lg">
                Créez votre boutique, postez vos produits et recevez des commandes. Agrumen s'occupe du paiement sécurisé et vous paye via Wave ou Orange Money.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary-container text-2xl">trending_up</span>
                  <div>
                    <div className="font-headline font-extrabold text-lg">Paiement garanti</div>
                    <div className="text-sm text-inverse-on-surface">Agrumen encaisse et vous paye après livraison.</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary-container text-2xl">storefront</span>
                  <div>
                    <div className="font-headline font-extrabold text-lg">Votre boutique en ligne</div>
                    <div className="text-sm text-inverse-on-surface">Gérez vos produits, stock et commandes facilement.</div>
                  </div>
                </div>
              </div>
              <Link
                to="/auth"
                className="inline-block bg-primary-container text-primary-container-foreground px-10 py-5 rounded-full font-headline font-extrabold text-lg hover:scale-95 transition-transform"
              >
                S'inscrire comme vendeur
              </Link>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full aspect-square md:aspect-auto md:h-[400px] rounded-lg overflow-hidden">
                <img
                  alt="Vendeur Agrumen"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB767-96WqPQEG_urSqrAvXwpsSdTT5CnrY3tb-jo-WUUS76j8-usg5gpsPNuMoe9CjEYlwI1q1_LUt6A0GGU6Be1Ma_IlFiw12H692fG4KLCmE3aWvX8e1Emc5OnNj8s2kOCvpasqjGlnVoyUm8wBc5mbsCK6Po_ZgAGjewsJSGsVB9kQoRoEX4gsU5GEVvjPPZmuLZp4bfutS1M_IdYnBt5Z6GgCuOnJ5YyCOsc0F6ATntbAspcSSTy7LWBOP-WS5wqvfz7s7PAJx"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto bg-surface-container-low rounded-t-[4rem]">
          <div className="text-center mb-20">
            <span className="text-primary font-headline font-extrabold text-sm uppercase tracking-widest">Témoignages</span>
            <h2 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tighter mt-2">Ils utilisent Agrumen.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`p-10 rounded-lg flex flex-col ${
                  t.featured
                    ? "bg-inverse-surface text-surface scale-105 shadow-2xl relative z-10"
                    : "bg-surface-container-lowest shadow-sm"
                }`}
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <span
                      key={j}
                      className={`material-symbols-outlined filled ${t.featured ? "text-primary-container" : "text-primary"}`}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className={`text-lg font-body italic leading-relaxed mb-10 ${t.featured ? "text-inverse-on-surface" : "text-on-surface-variant"}`}>
                  "{t.text}"
                </p>
                <div className="mt-auto flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center font-headline font-bold text-lg">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className={`font-headline font-extrabold ${t.featured ? "text-surface" : ""}`}>{t.name}</div>
                    <div className={`text-xs uppercase font-bold ${t.featured ? "text-inverse-on-surface" : "text-on-surface-variant"}`}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto text-center">
          <div className="bg-primary-container rounded-xl p-16 md:p-32 relative overflow-hidden">
            <h2 className="text-5xl md:text-7xl font-headline font-extrabold text-primary-container-foreground tracking-tighter mb-8 relative z-10">
              Achetez local.<br />Soutenez nos producteurs.
            </h2>
            <p className="text-xl text-primary-container-foreground font-body max-w-2xl mx-auto mb-12 opacity-80 relative z-10">
              Rejoignez Agrumen, la marketplace qui connecte les producteurs sénégalais directement aux acheteurs.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10">
              <Link to="/auth" className="bg-inverse-surface text-surface px-12 py-6 rounded-full font-headline font-extrabold text-xl shadow-2xl hover:scale-105 transition-transform">
                Commencer maintenant
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
