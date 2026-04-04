import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "@/components/Footer";
import { Link, Navigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import { useAuth } from "@/contexts/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const } }),
};

const steps = [
  { icon: "search", num: "01", title: "Explorez le Marché", description: "Parcourez les produits frais de nos artisans locaux, filtrés par catégorie et localisation." },
  { icon: "add_shopping_cart", num: "02", title: "Composez votre Panier", description: "Sélectionnez vos produits préférés et ajoutez-les à votre panier en un clic." },
  { icon: "payments", num: "03", title: "Payez Simplement", description: "Réglez via Wave ou Orange Money. Paiement instantané, sécurisé et sans friction." },
  { icon: "local_shipping", num: "04", title: "Recevez chez Vous", description: "Livraison rapide à Dakar et environs. Du champ à votre table en moins de 24h." },
];

const Index = () => {
  const { user, role, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!loading && user && role === "buyer") {
    return <Navigate to="/marche" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 relative">
      {/* Floating hamburger menu */}
      <div className="fixed top-4 right-4 z-[60]">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-xl shadow-lg border border-border/30"
          aria-label="Menu"
        >
          <span className="material-symbols-outlined text-2xl text-foreground">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 right-4 z-[60] bg-background/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border/30 min-w-[200px] overflow-hidden"
          >
            <div className="flex flex-col p-3 gap-1">
              <Link to="/marche" onClick={() => setMenuOpen(false)} className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground py-3 px-4 rounded-xl hover:bg-surface-container transition-colors">
                Marché
              </Link>
              {user ? (
                <>
                  {role === "seller" ? (
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground py-3 px-4 rounded-xl hover:bg-surface-container transition-colors">
                      Mes Produits
                    </Link>
                  ) : (
                    <Link to="/mon-compte" onClick={() => setMenuOpen(false)} className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground py-3 px-4 rounded-xl hover:bg-surface-container transition-colors">
                      Mon Compte
                    </Link>
                  )}
                </>
              ) : (
                <Link to="/auth" onClick={() => setMenuOpen(false)} className="font-headline font-extrabold uppercase tracking-tight text-sm text-primary py-3 px-4 rounded-xl hover:bg-surface-container transition-colors">
                  Connexion
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-4">
        {/* ═══════ HERO ═══════ */}
        <section className="px-4 md:px-12 py-4 md:py-8 max-w-[1440px] mx-auto">
          <div className="relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden min-h-[85vh] md:min-h-[700px] flex items-end md:items-center">
            {/* Background image */}
            <div className="absolute inset-0 z-0">
              <img src={heroBg} alt="Terres agricoles du Sénégal" className="w-full h-full object-cover" width={1920} height={1080} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 md:bg-gradient-to-r md:from-black/80 md:via-black/50 md:to-transparent" />
            </div>

            {/* Hero content */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative z-10 px-6 md:px-16 pb-12 md:pb-0 w-full md:w-2/3"
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white font-headline font-bold text-[11px] md:text-xs uppercase tracking-widest mb-5 md:mb-8"
              >
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                L'Agronome Digital
              </motion.span>

              <h1 className="text-[2.5rem] md:text-7xl lg:text-8xl font-headline font-extrabold text-white tracking-tighter leading-[0.92] mb-5 md:mb-8">
                Cultiver l'âme<br />
                <span className="text-primary-container">de nos terroirs.</span>
              </h1>

              <p className="text-base md:text-xl text-white/75 font-body max-w-xl leading-relaxed mb-8 md:mb-10">
                Une connexion directe entre les foyers sénégalais et les gardiens de notre terre. Des produits purs, une équité radicale.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/marche"
                  className="bg-primary-container text-primary-container-foreground px-8 py-4 md:px-10 md:py-5 rounded-full font-headline font-extrabold text-base md:text-lg flex items-center justify-center gap-3 hover:scale-[0.97] active:scale-95 transition-transform shadow-[0_8px_32px_rgba(154,205,50,0.3)]"
                >
                  Découvrir le Marché
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link
                  to="/auth?role=seller"
                  className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 md:px-10 md:py-5 rounded-full font-headline font-extrabold text-base md:text-lg hover:bg-white hover:text-foreground transition-all text-center"
                >
                  Devenir Vendeur
                </Link>
              </div>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="flex items-center gap-6 mt-8 md:mt-12"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-lg">verified</span>
                  <span className="text-white/60 text-xs font-headline font-bold">100% Local</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-lg">eco</span>
                  <span className="text-white/60 text-xs font-headline font-bold">Sans Pesticides</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-lg">schedule</span>
                  <span className="text-white/60 text-xs font-headline font-bold">Livré en 24h</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section className="py-20 md:py-32 px-4 md:px-12 max-w-[1440px] mx-auto">
          <div className="text-center mb-14 md:mb-20">
            <span className="text-primary font-headline font-extrabold text-xs uppercase tracking-widest">Simple & Rapide</span>
            <h2 className="text-3xl md:text-6xl font-headline font-extrabold tracking-tighter mt-2">Comment ça marche ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <motion.div key={step.num} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative group">
                <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 border border-border/20 hover:border-primary-container/50 hover:shadow-xl transition-all h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center group-hover:bg-primary-container transition-colors">
                      <span className="material-symbols-outlined text-primary text-xl">{step.icon}</span>
                    </div>
                    <span className="text-4xl font-headline font-extrabold text-border/40">{step.num}</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-headline font-extrabold mb-2">{step.title}</h3>
                  <p className="text-on-surface-variant font-body text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ VALUES ═══════ */}
        <section className="py-16 md:py-28 px-4 md:px-12 max-w-[1440px] mx-auto">
          <div className="bg-surface-container-low rounded-3xl p-8 md:p-16 lg:p-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <span className="text-primary font-headline font-extrabold text-xs uppercase tracking-widest">Nos Engagements</span>
                <h2 className="text-3xl md:text-5xl font-headline font-extrabold tracking-tighter mt-2 mb-8">L'Art de Bien Faire</h2>
                <div className="space-y-6">
                  {[
                    { icon: "handshake", title: "Équité Radicale", desc: "Les agriculteurs fixent leurs propres prix. Zéro intermédiaire inutile." },
                    { icon: "temp_preferences_custom", title: "Traçabilité Absolue", desc: "Chaque produit raconte une histoire. Du champ d'origine au producteur." },
                    { icon: "nutrition", title: "Pureté Originelle", desc: "Zéro pesticide chimique. Méthodes ancestrales et biologiques." },
                  ].map((v, i) => (
                    <motion.div key={v.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex gap-4 items-start">
                      <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-container/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-xl">{v.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-headline font-extrabold text-lg">{v.title}</h3>
                        <p className="text-on-surface-variant text-sm font-body leading-relaxed mt-1">{v.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
                <div className="aspect-square rounded-3xl bg-primary/10 flex items-center justify-center overflow-hidden">
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-container/30 to-primary/20 rounded-3xl" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-primary text-7xl md:text-8xl mb-4 block">eco</span>
                        <div className="text-2xl md:text-3xl font-headline font-extrabold text-primary">100% Local</div>
                        <div className="text-sm text-on-surface-variant font-body mt-2">Sénégal • Niayes • Casamance</div>
                      </div>
                    </div>
                    <div className="absolute top-8 right-8 grid grid-cols-3 gap-2">
                      {[...Array(9)].map((_, j) => (
                        <div key={j} className="w-2 h-2 rounded-full bg-primary-container/40" />
                      ))}
                    </div>
                    <div className="absolute bottom-8 left-8 grid grid-cols-3 gap-2">
                      {[...Array(9)].map((_, j) => (
                        <div key={j} className="w-2 h-2 rounded-full bg-primary/20" />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════ SELLER CTA ═══════ */}
        <section className="py-16 md:py-24 px-4 md:px-12 max-w-[1440px] mx-auto">
          <div className="bg-inverse-surface rounded-2xl md:rounded-3xl p-8 md:p-16 lg:p-20 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <div className="flex-1 text-surface">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary-container text-primary-container-foreground font-headline font-extrabold text-[10px] uppercase tracking-widest mb-6">
                Vendeurs
              </span>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-headline font-extrabold tracking-tighter mb-6">
                Vous Cultivez.<br />Nous Vous Connectons.
              </h2>
              <p className="text-base md:text-lg text-inverse-on-surface mb-8 leading-relaxed max-w-lg">
                Devenez un Artisan Agrumen. Bénéficiez d'outils de gestion, de visibilité et de paiements instantanés via Wave et Orange Money.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary-container text-xl">trending_up</span>
                  <div>
                    <div className="font-headline font-extrabold">Revenu Direct</div>
                    <div className="text-sm text-inverse-on-surface">Fixez vos prix, zéro commission cachée.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary-container text-xl">dashboard</span>
                  <div>
                    <div className="font-headline font-extrabold">Dashboard Pro</div>
                    <div className="text-sm text-inverse-on-surface">Gérez vos produits et commandes facilement.</div>
                  </div>
                </div>
              </div>
              <Link to="/auth?role=seller" className="inline-block bg-primary-container text-primary-container-foreground px-8 py-4 rounded-full font-headline font-extrabold text-base md:text-lg hover:scale-95 transition-transform">
                Devenir Partenaire
              </Link>
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="aspect-square rounded-2xl bg-surface/5 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent" />
                <div className="text-center relative z-10">
                  <span className="material-symbols-outlined text-primary-container text-8xl mb-4 block">eco</span>
                  <div className="text-lg font-headline font-extrabold text-surface">Vendez vos produits</div>
                  <div className="text-sm text-inverse-on-surface mt-1">en 5 minutes</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ FINAL CTA ═══════ */}
        <section className="py-16 md:py-24 px-4 md:px-12 max-w-[1440px] mx-auto text-center">
          <div className="bg-primary-container rounded-2xl md:rounded-3xl p-10 md:p-24 lg:p-32 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-48 h-48 border-4 border-primary-container-foreground rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-72 h-72 border-4 border-primary-container-foreground rounded-full translate-x-1/2 translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-primary-container-foreground rounded-full" />
            </div>
            <h2 className="text-3xl md:text-6xl lg:text-8xl font-headline font-extrabold text-primary-container-foreground tracking-tighter mb-6 relative z-10">
              Mangez Local.<br />Soutenez nos Héros.
            </h2>
            <p className="text-base md:text-xl text-primary-container-foreground/80 font-body max-w-2xl mx-auto mb-8 md:mb-12 relative z-10">
              Rejoignez des milliers de Sénégalais qui font le choix de la qualité, de la fraîcheur et de la justice sociale.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Link to="/marche" className="bg-inverse-surface text-surface px-8 py-5 md:px-12 md:py-6 rounded-full font-headline font-extrabold text-lg md:text-xl shadow-2xl hover:scale-105 transition-transform">
                Explorer le Marché
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
