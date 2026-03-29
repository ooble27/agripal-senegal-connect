import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const advantages = [
  {
    icon: "visibility",
    title: "Visibilité Directe",
    description: "Atteignez des milliers de foyers à Dakar sans quitter votre exploitation. Votre profil et vos produits sont mis en avant.",
  },
  {
    icon: "local_shipping",
    title: "Logistique Simplifiée",
    description: "Concentrez-vous sur la terre. Nous gérons la collecte, le transport et la livraison du dernier kilomètre jusqu'au client final.",
  },
  {
    icon: "account_balance_wallet",
    title: "Paiements Garantis",
    description: "Finies les incertitudes. Recevez vos revenus instantanément via Orange Money ou Wave dès la confirmation de livraison.",
  },
];

const steps = [
  { num: "01", title: "Créez votre compte", desc: "Remplissez vos informations de base et précisez la localisation de votre exploitation agricole." },
  { num: "02", title: "Listez vos produits", desc: "Prenez en photo vos récoltes disponibles, fixez vos prix et indiquez vos quantités en stock." },
  { num: "03", title: "Recevez vos commandes", desc: "Soyez notifié en temps réel sur votre téléphone dès qu'un client dakarois commande vos produits." },
  { num: "04", title: "Préparez la récolte", desc: "Récoltez les produits frais. Nous passons les récupérer pour les livrer. C'est tout." },
];

const testimonials = [
  {
    text: "Avant Agrumen, je dépendais des intermédiaires qui achetaient mes produits à bas prix. Aujourd'hui, je fixe mes prix et mes revenus ont augmenté de 40%.",
    name: "Moussa Diop",
    role: "Producteur Maraîcher, Sangalkam",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3ZbPN69NFBNS-rrXVZghILRdyKSL8B3pk5R7qutXL5mttTaC-_V9J8lOvyR9J9pR3WnoEejMWxIIfYdpk_fIcutQtmL65S77O0Du8QWV3jeukWwFt9Lepk0JWS_fJC4cwyakqML-kfIccPvQmU6vrfLfreoCvRe7jAdvN5GWgIIgVwHY2LOk4XtQnCZ8kZvGlZLaqD3JRmCKzrypkSuAEOxkHFBQcDRuktGIhmTEdQXGhnkEXg5wf2p_2BgUHBzWMgnvlC1OBkBtE",
  },
  {
    text: "La logistique était mon plus grand défi. Savoir qu'Agrumen s'occupe de la livraison me permet de me concentrer uniquement sur la qualité de mes cultures.",
    name: "Fatou Ndiaye",
    role: "Arboricultrice, Sébikotane",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC23ODkTvet97j-pCK0YJ7jq_4imzLlsNWV3mF_uZIi_DWUil52xQzXwiSxwnPJBCE6IVDiXQLeRzLFuPSh9KbuOpAGtKw5m4meoXdAGUKGU1ZeABMuZj99WrPkNYioOmg475UUeOhotcdE9dg_Adec9Lhsb8R6JBSMB0iXcNQJTOzPlflOAmoFvUOulDNQok9OlaRx81FS5sbhcq5C8so_8AQLPFjyPjdacpPCglrE9yx8yM1i-Up11DuyWMfXlVkprb159h0xDL_H",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const DevenirProducteur = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 overflow-x-hidden">
        {/* Hero */}
        <section className="px-8 py-16 md:py-32 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full md:w-1/2 space-y-8"
          >
            <div className="inline-block bg-primary-container/20 text-primary px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase">
              Directement du champ à l'assiette
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tighter">
              Vendez vos récoltes au prix juste.{" "}
              <span className="text-primary">Rejoignez le réseau Agrumen Sénégal.</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-md leading-relaxed">
              Éliminez les intermédiaires et connectez-vous directement aux consommateurs de Dakar. Une logistique simplifiée, des paiements garantis.
            </p>
            <div className="flex gap-4">
              <a href="#inscription" className="bg-primary-container text-primary-container-foreground px-8 py-4 rounded-full font-bold text-lg hover:scale-95 transition-all shadow-lg shadow-primary/10">
                Commencer maintenant
              </a>
              <button className="bg-surface-container-high text-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-surface-container-highest transition-all">
                En savoir plus
              </button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="w-full md:w-1/2 relative"
          >
            <div className="aspect-[4/5] rounded-xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
              <img
                alt="Agriculteur local"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB75MaJrJ8Yw41j-VoT2X2b7x8xTUaapB8oizk0yDiNanQ_7NeOJuWe_E93XsxLQkvvkCzFRAoM1HvEC3P6i4M4zjQk9-dH4gRJsUWAj7gv3gU5sfDM1Py6bjzHbnILBH8HxZZBclmbHu5qyIu-k6_0WTYnzAPwSe9DNlUIgJsKGjdbLJa3-cCQxCqjgwsiJmqX_ZLJA-9JxCnkoWct4p-7aWkt45NLc5ATUvazH0Z_KicyexILFRb_LDI4VbybAdI2uFalGH5vfeIY"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-card p-6 rounded-lg shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">trending_up</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase font-bold tracking-widest">Revenus moyens</p>
                <p className="text-xl font-black">+35% par récolte</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Advantages */}
        <section className="bg-surface-container-low py-24 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-extrabold tracking-tight">Pourquoi choisir Agrumen ?</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">Nous avons conçu un écosystème qui respecte votre travail et valorise vos produits auprès des citadins.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {advantages.map((adv, i) => (
                <motion.div
                  key={adv.title}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="bg-surface-container-lowest p-10 rounded-lg group hover:bg-primary-container transition-colors duration-500"
                >
                  <span className="material-symbols-outlined text-4xl text-primary group-hover:text-primary-container-foreground mb-6">{adv.icon}</span>
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-primary-container-foreground">{adv.title}</h3>
                  <p className="text-on-surface-variant group-hover:text-primary-container-foreground/80 leading-relaxed">{adv.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-24 px-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-start">
            <div className="w-full md:w-1/3">
              <h2 className="text-4xl font-extrabold tracking-tight mb-6">Un parcours simple pour grandir ensemble</h2>
              <p className="text-on-surface-variant mb-8">En moins de 48h, votre boutique numérique peut être opérationnelle.</p>
              <div className="aspect-square rounded-xl overflow-hidden">
                <img
                  alt="Processus de récolte"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCM61TkRmW5Ru39UGZnXaroSgRsPUQ3WwTU6sTCZ7VAINxUGNXj7IIVDlpemM3eCZC8beGu71MRrblIjumP2JXPEZn_cco9qK32ilH7WpTGWoJn9Of4JouhslL0Qk4s8gOBAQh8rfm6TgtKIvdPQOWNAg-KEq-ogq44afDasF9DH_tNLMHkc-a6xHYiisU-9Vksw0pcAFe_c8u9ijBWJt_MW3polB7KluRxL48uQJ2nLkHo3gQhuNtURgHbDP38XgMiezAHqP6fl8Nu"
                />
              </div>
            </div>
            <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="space-y-4"
                >
                  <div className="text-6xl font-black text-outline-variant/20">{step.num}</div>
                  <h4 className="text-xl font-bold">{step.title}</h4>
                  <p className="text-on-surface-variant">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard Preview */}
        <section className="bg-inverse-surface text-surface py-24 px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
            <div className="w-full md:w-1/2 space-y-6">
              <h2 className="text-4xl font-extrabold leading-tight">Votre exploitation dans votre poche</h2>
              <p className="text-inverse-on-surface text-lg">Un tableau de bord intuitif conçu pour les agriculteurs. Gérez vos stocks, suivez vos gains et analysez la demande en un clin d'œil.</p>
              <ul className="space-y-4">
                {["Suivi des ventes en temps réel", "Alertes de stock bas", "Historique de paiements transparent"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-container">check_circle</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full md:w-1/2">
              <div className="bg-card p-4 rounded-lg shadow-2xl transform md:rotate-3">
                <div className="bg-surface p-6 rounded-sm space-y-6">
                  <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4">
                    <div className="font-bold text-foreground">Tableau de Bord Agrumen</div>
                    <div className="w-8 h-8 rounded-full bg-surface-container-high" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary-container/10 p-4 rounded border border-primary-container/30">
                      <div className="text-[10px] uppercase font-bold text-primary">Ventes du jour</div>
                      <div className="text-2xl font-black text-foreground">45 500 FCFA</div>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded">
                      <div className="text-[10px] uppercase font-bold text-on-surface-variant">Commandes</div>
                      <div className="text-2xl font-black text-foreground">12</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-8 max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold mb-16">Ils nous font confiance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {testimonials.map((t) => (
              <div key={t.name} className="text-left bg-surface-container-low p-12 rounded-xl relative">
                <span className="material-symbols-outlined text-6xl text-primary/20 absolute top-8 right-8">format_quote</span>
                <p className="text-xl italic mb-8">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <img alt={t.name} className="w-14 h-14 rounded-full object-cover" src={t.image} />
                  <div>
                    <p className="font-bold">{t.name}</p>
                    <p className="text-sm text-on-surface-variant">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sign-up Form */}
        <section id="inscription" className="py-24 px-8">
          <div className="max-w-4xl mx-auto bg-card p-12 md:p-20 rounded-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 rounded-full -mr-32 -mt-32" />
            <div className="relative z-10">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-extrabold tracking-tight mb-4">Prêt à changer de dimension ?</h2>
                <p className="text-on-surface-variant">Inscrivez-vous aujourd'hui et commencez à vendre dès demain.</p>
              </div>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1">Nom complet</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary-container p-4" placeholder="Prénom et Nom" type="text" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1">Localisation</label>
                    <input className="w-full bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary-container p-4" placeholder="ex: Sangalkam, Kayar..." type="text" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-on-surface-variant ml-1">Type de culture principal</label>
                  <select className="w-full bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary-container p-4">
                    <option>Maraîchage (Légumes)</option>
                    <option>Arboriculture (Fruits)</option>
                    <option>Céréales</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-on-surface-variant ml-1">Numéro de téléphone (Orange Money / Wave)</label>
                  <input className="w-full bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary-container p-4" placeholder="77 000 00 00" type="tel" />
                </div>
                <button className="w-full bg-primary-container text-primary-container-foreground py-5 rounded-full font-black text-xl hover:scale-[0.98] transition-all duration-300 mt-8" type="submit">
                  S'inscrire comme Producteur
                </button>
                <p className="text-center text-xs text-on-surface-variant">En vous inscrivant, vous acceptez nos conditions générales d'utilisation.</p>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 px-8 mt-20 bg-surface-container-low">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="text-lg font-bold text-primary">Agrumen</div>
            <p className="text-xs uppercase tracking-widest text-on-surface-variant leading-relaxed">
              La plateforme qui rapproche la terre des dakarois. Qualité, fraîcheur et équité.
            </p>
          </div>
          <div>
            <h5 className="text-sm font-bold mb-6">Liens Rapides</h5>
            <div className="flex flex-col gap-4 text-xs uppercase tracking-widest">
              <a href="#" className="text-on-surface-variant hover:text-foreground underline decoration-primary-container decoration-2 underline-offset-4">Conditions Générales</a>
              <a href="#" className="text-on-surface-variant hover:text-foreground underline decoration-primary-container decoration-2 underline-offset-4">Confidentialité</a>
            </div>
          </div>
          <div>
            <h5 className="text-sm font-bold mb-6">Support</h5>
            <div className="flex flex-col gap-4 text-xs uppercase tracking-widest text-on-surface-variant">
              <a href="#" className="hover:text-foreground">Contact Support</a>
              <a href="#" className="hover:text-foreground">Aide Producteur</a>
            </div>
          </div>
          <div>
            <h5 className="text-sm font-bold mb-6">Partenariat</h5>
            <div className="flex flex-col gap-4 text-xs uppercase tracking-widest text-on-surface-variant">
              <a href="#" className="hover:text-foreground">Devenir Partenaire</a>
              <a href="#" className="hover:text-foreground">Investisseurs</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant text-center md:text-left">
            © 2024 Agrumen Sénégal. Propulsé par Hyper-Organic Precision.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default DevenirProducteur;
