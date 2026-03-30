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
    description: "Les vendeurs fixent leurs propres prix. Agrumen encaisse, puis paye le vendeur après validation de la commande.",
  },
  {
    icon: "temp_preferences_custom",
    title: "Traçabilité Complète",
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
        {/* Hero Section — Clean gradient, no background image */}
        <section className="px-6 md:px-12 py-12 max-w-[1440px] mx-auto overflow-hidden">
          <div className="relative rounded-3xl overflow-hidden min-h-[560px] flex items-center bg-gradient-to-br from-primary via-primary/80 to-primary-container">
            {/* Abstract shapes */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary-container/30 blur-3xl -mr-40 -mt-40" />
            <div className="absolute bottom-0 left-1/2 w-[400px] h-[400px] rounded-full bg-tertiary/20 blur-3xl -mb-32" />
            <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full border-2 border-surface/10" />

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 px-8 md:px-16 w-full md:w-2/3 py-16"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-surface/20 backdrop-blur-sm text-surface font-headline font-extrabold text-xs uppercase tracking-widest mb-6">
                Marketplace Agricole du Sénégal
              </span>
              <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-surface tracking-tighter leading-[0.9] mb-8">
                Achetez directement aux producteurs sénégalais.
              </h1>
              <p className="text-xl text-surface/80 font-body max-w-xl leading-relaxed mb-10">
                Agrumen connecte acheteurs et vendeurs. Produits frais, prix justes, paiement sécurisé via Wave et Orange Money.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth" className="bg-surface text-primary px-10 py-5 rounded-full font-headline font-extrabold text-lg flex items-center gap-3 hover:scale-95 transition-transform shadow-xl">
                  Créer un compte
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link to="/devenir-producteur" className="bg-surface/10 backdrop-blur-md text-surface border border-surface/20 px-10 py-5 rounded-full font-headline font-extrabold text-lg hover:bg-surface/20 transition-all">
                  Vendre sur Agrumen
                </Link>
              </div>
            </motion.div>

            {/* Right side illustration elements */}
            <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 flex-col gap-4 z-10">
              <div className="bg-surface/15 backdrop-blur-md rounded-2xl p-6 w-56">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-surface text-2xl">eco</span>
                  <span className="text-surface font-headline font-bold text-sm">100% Local</span>
                </div>
                <p className="text-surface/70 text-xs">Produits cultivés au Sénégal par des agriculteurs vérifiés</p>
              </div>
              <div className="bg-surface/15 backdrop-blur-md rounded-2xl p-6 w-56 ml-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-surface text-2xl">payments</span>
                  <span className="text-surface font-headline font-bold text-sm">Paiement Mobile</span>
                </div>
                <p className="text-surface/70 text-xs">Wave & Orange Money acceptés</p>
              </div>
              <div className="bg-surface/15 backdrop-blur-md rounded-2xl p-6 w-56">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-surface text-2xl">local_shipping</span>
                  <span className="text-surface font-headline font-bold text-sm">Livraison Dakar</span>
                </div>
                <p className="text-surface/70 text-xs">Livré frais directement chez vous</p>
              </div>
            </div>
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
                to="/auth?role=seller"
                className="inline-block bg-primary-container text-primary-container-foreground px-10 py-5 rounded-full font-headline font-extrabold text-lg hover:scale-95 transition-transform"
              >
                S'inscrire comme vendeur
              </Link>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full aspect-square md:aspect-auto md:h-[400px] rounded-lg overflow-hidden bg-inverse-on-surface/10 flex items-center justify-center">
                <div className="text-center p-8">
                  <span className="material-symbols-outlined text-primary-container text-[80px] mb-4">agriculture</span>
                  <p className="text-surface font-headline font-extrabold text-2xl">Vendez vos récoltes</p>
                  <p className="text-inverse-on-surface mt-2">Directement aux consommateurs</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto text-center">
          <div className="bg-primary-container rounded-xl p-16 md:p-32 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-tertiary/10 rounded-full -ml-32 -mb-32" />
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
