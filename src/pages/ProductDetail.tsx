import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";

const allProducts = [
  {
    id: "carottes-niayes",
    name: "Carottes des Niayes",
    farmer: "Aminata Sy",
    farmName: "Ferme Familiale Sy",
    location: "Thiès, Sénégal",
    region: "Niayes",
    unit: "le kg",
    price: "1.250 FCFA",
    badge: "Frais du matin",
    badgeColor: "bg-primary-container text-primary-container-foreground",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAMQsYDwNzgAY59ikYriTHGOo5V-h9q3GToGcwIzcG45k6TKMamctsLNg4mFn6lKq9NIncvPxEdJF3Vkvh9xfPAQ8TmvaqQaeslBPRpSZ6FVi4RwmWk2j8rKDMnfm-9CYhOCNtYksqGSWydm8cf4kMoDeu07cW-PgWtT0_F-fKQ_p5JZTE75c3xvLoUIFJlSiRTj4qqZ4PcESA4HLqqKYPuT6-SZZ3oXiDZtnWSKYHWLf-uvmdc4Lk4K5Fl9rzqOgfJbHjG9f1mAlXu",
    farmerImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuAnmXh2GQDR1vo_aqRRGxfOsptfazWdGdMh692pUxoUFGNsLkujsk31EynA0kwB8z86ofTckqhz8RutoTeAMCltjMLV6WRACv568h_DbbuzH80yR86mO16lA_GA668wyIlzHmpNQQL5gYKQJpzMoaNvD1J7ensxkfF40VdSCoutAHmUNfUK0XuMRkEx3cHaEyNhgpu0XAQv_eS0HUYI69Azh-RIQ0bco2EQQH1v-2kpCt7hcZWaSxa2nMkOsFTIZEPgLh1QbMz1h33u",
    description: "Carottes cultivées dans les sols riches de la région des Niayes, récoltées à la main chaque matin pour garantir une fraîcheur optimale. Sans pesticides, cultivées selon les méthodes traditionnelles sénégalaises.",
    farmerBio: "Aminata cultive la terre familiale depuis 15 ans dans la région des Niayes. Passionnée par l'agriculture biologique, elle emploie 8 femmes de son village et forme les jeunes aux techniques durables.",
    traceability: {
      semis: "12 Janvier 2026",
      recolte: "28 Mars 2026",
      methode: "Agriculture biologique",
      certification: "Bio Sénégal",
      parcelle: "Parcelle A3 — Niayes Nord",
      sol: "Sol argilo-sableux enrichi au compost",
      irrigation: "Goutte-à-goutte solaire",
      tempsChamp: "75 jours",
    },
    nutrition: {
      calories: "41 kcal / 100g",
      fibres: "2.8g",
      vitamineA: "835 µg",
      potassium: "320 mg",
    },
    relatedProducts: ["mangues-kent", "piment-oiseau"],
  },
  {
    id: "mangues-kent",
    name: "Mangues Kent Bio",
    farmer: "Ibrahima Diallo",
    farmName: "Verger de Casamance",
    location: "Ziguinchor",
    region: "Casamance",
    unit: "la caisse",
    price: "4.800 FCFA",
    badge: "Meilleure Vente",
    badgeColor: "bg-tertiary text-tertiary-foreground",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuANaTR0jqCtz5dPUzGkOhSJY_Rh7jDH4dSUd6T7JW-phJ9aSnOAKsl1cj0aXDnq2NDab68OcCpTEMPYiEoLHbTEJTWoszEFNoVJbjN6o6GVRTwV11TKdGaKRVtgyhX_ff5qF-cstnp6927PylA2-bzBlYZc3YZ_HwjYOqJR31mrn7-5WIUKQ9A8rk7lVDBXfY7ZO4uSbK3QIjOB5GAl1_KfPRYjasEb82x8F4vSEwYh51WhUPcFt7qw2vEvXF2z_Mvg55PmTGZ_BzBm",
    farmerImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuC60RyBev9JTvOrrvaELLgjN6-bWSeoe0NTXeSEaZ172AbX99johkibE5Evy5CrMA1S1bUVwWK4dRjetKBN-5JZuAfxfcMd_ltbeHALhuO03vf0V7AFIyIB1whysyQIN1d9yR9TCLQ70hfJXx9yml5FwVAqyXa29QreeJXFjdEwL7wk9nOt3LUSIEDHzzUHb0Eu2eTPk6aFGyq6zyKZC2XKtgL0995bYLxA9ZKs39LRtb6fnQZ7JDaJ75mO0Sf_6BDA_adMqRLNvV26",
    description: "Mangues Kent de qualité supérieure, cultivées dans les vergers luxuriants de Casamance. Cueillies à maturité pour un goût sucré et une chair fondante incomparables.",
    farmerBio: "Ibrahima gère un verger familial de 12 hectares en Casamance depuis 20 ans. Son exploitation emploie 15 personnes et produit les mangues les plus prisées de la région.",
    traceability: {
      semis: "Arbre planté en 2008",
      recolte: "25 Mars 2026",
      methode: "Agroforesterie biologique",
      certification: "Bio Sénégal, Commerce Équitable",
      parcelle: "Verger B — Casamance Sud",
      sol: "Sol ferralitique profond",
      irrigation: "Pluviale naturelle",
      tempsChamp: "Maturation 4 mois",
    },
    nutrition: {
      calories: "60 kcal / 100g",
      fibres: "1.6g",
      vitamineA: "54 µg",
      potassium: "168 mg",
    },
    relatedProducts: ["carottes-niayes", "oignons-podor"],
  },
  {
    id: "piment-oiseau",
    name: "Piment Oiseau",
    farmer: "Ousmane Ndiaye",
    farmName: "Ferme de Sangalkam",
    location: "Rufisque",
    region: "Cap-Vert",
    unit: "250g",
    price: "800 FCFA",
    badge: null,
    badgeColor: "",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDqTSQZR-A5PJTKBQFpApVb-syAg0k0RQqLN10XAw13as-NTOK3tupxrSedVzQ8vpJ_kCIqhZthKYAatFG6dhQpKPXYZwN8UqEgorYkHo7QUdWN0KWwYFlf-ZQ4rDtjiLBbMDsWuaZzn21r4-OSMETsijchrfu0s8a2WgHiKvQXMJtbuuMqcU7aWezWK8PBDsxtdSs2GudhEbhVd-e3KqbcmepLjoMpeNjkZc8vX8C5SjavfviJizhUMbtCadfwfvkhf7QSCk6yVM4N",
    farmerImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuD0MkwjxhkmIi_VLCXA5v2nucWG3IIsX2Gfw7jfLRDf8e8GPhXdRgVgW6P3x6Ql-da_BzRL0X39o-tf1YCmUzD_zB_f9f_po4g_Nzngs5-nWopF_NMYa8IiYCNySD_onnHHpfKugCA9Qugfrcp-duG3YJ_9cjigjp-s9q7nJe_DXCpm-_gQ2VER-wApMewZOakOZFX6pMCO2RCGUEagP0DNaYVIiu9lqQY1HOwvT_Rd1TEpaVdQAUxhuU-94s2BfXRGG7TLJ3vcjcwh",
    description: "Piment oiseau frais, cultivé en plein air dans les champs de Sangalkam. Réputé pour sa puissance aromatique et son piquant authentique, indispensable dans la cuisine sénégalaise.",
    farmerBio: "Ousmane est un maraîcher expérimenté de Sangalkam. Spécialisé dans les épices et condiments locaux, il fournit les meilleurs restaurants de Dakar depuis 10 ans.",
    traceability: {
      semis: "5 Décembre 2025",
      recolte: "27 Mars 2026",
      methode: "Culture traditionnelle",
      certification: "Label Terroir Sénégal",
      parcelle: "Champ C1 — Sangalkam",
      sol: "Sol sablonneux fertile",
      irrigation: "Aspersion manuelle",
      tempsChamp: "112 jours",
    },
    nutrition: {
      calories: "40 kcal / 100g",
      fibres: "1.5g",
      vitamineA: "48 µg",
      potassium: "322 mg",
    },
    relatedProducts: ["carottes-niayes", "oignons-podor"],
  },
  {
    id: "oignons-podor",
    name: "Oignons de Podor",
    farmer: "Mamadou Fall",
    farmName: "Coopérative Podor",
    location: "Podor",
    region: "Vallée du Fleuve",
    unit: "le kg",
    price: "950 FCFA",
    badge: null,
    badgeColor: "",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhqXUiIGsnspJvfLjMvup4MT1gbPRsMTOciURTqe4EBjexM2v7ZaRZ6sX-WTfAjVpQ1UPhM7jDA9Sg_2VkvWLTOU5D28Cn0fYGw5StTCr3tF2jpDYrNbiX5edErxqwrWNitGPT1X3DZNmoveMHtYd17Wf5WA6MhLjGmq-swOPMjgxCFKoEptcMR3cB_ZE27DRYBe7drfiQsSHu3qH8yIvJo2zx77bqiH7UsbM6ztDKOlK5ueaA0mEWi70tpW7BxzKrGcs5iwPuWr1l",
    farmerImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuAnmXh2GQDR1vo_aqRRGxfOsptfazWdGdMh692pUxoUFGNsLkujsk31EynA0kwB8z86ofTckqhz8RutoTeAMCltjMLV6WRACv568h_DbbuzH80yR86mO16lA_GA668wyIlzHmpNQQL5gYKQJpzMoaNvD1J7ensxkfF40VdSCoutAHmUNfUK0XuMRkEx3cHaEyNhgpu0XAQv_eS0HUYI69Azh-RIQ0bco2EQQH1v-2kpCt7hcZWaSxa2nMkOsFTIZEPgLh1QbMz1h33u",
    description: "Oignons violets de Podor, reconnus pour leur saveur intense et leur excellente conservation. Cultivés dans la Vallée du Fleuve Sénégal avec l'eau du fleuve.",
    farmerBio: "Mamadou dirige la Coopérative de Podor qui rassemble 45 agriculteurs de la Vallée du Fleuve. Ensemble, ils produisent les meilleurs oignons du Sénégal grâce à l'irrigation fluviale.",
    traceability: {
      semis: "20 Novembre 2025",
      recolte: "26 Mars 2026",
      methode: "Culture irriguée traditionnelle",
      certification: "Coopérative Certifiée",
      parcelle: "Périmètre irrigué D2 — Podor",
      sol: "Sol alluvionnaire du fleuve",
      irrigation: "Canal d'irrigation fluviale",
      tempsChamp: "126 jours",
    },
    nutrition: {
      calories: "40 kcal / 100g",
      fibres: "1.7g",
      vitamineA: "1 µg",
      potassium: "146 mg",
    },
    relatedProducts: ["carottes-niayes", "mangues-kent"],
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

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const product = allProducts.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-24 px-6 md:px-12 max-w-[1440px] mx-auto text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-6">search_off</span>
          <h1 className="text-4xl font-headline font-extrabold mb-4">Produit introuvable</h1>
          <p className="text-on-surface-variant mb-8">Ce produit n'existe pas ou a été retiré du catalogue.</p>
          <Link to="/" className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-full font-headline font-extrabold hover:scale-95 transition-transform">
            Retour au Marché
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const related = allProducts.filter((p) => product.relatedProducts.includes(p.id));

  const traceSteps = [
    { icon: "grass", label: "Semis", value: product.traceability.semis },
    { icon: "water_drop", label: "Irrigation", value: product.traceability.irrigation },
    { icon: "landscape", label: "Sol", value: product.traceability.sol },
    { icon: "schedule", label: "Durée", value: product.traceability.tempsChamp },
    { icon: "agriculture", label: "Récolte", value: product.traceability.recolte },
    { icon: "verified", label: "Certification", value: product.traceability.certification },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        {/* Breadcrumb */}
        <div className="px-6 md:px-12 max-w-[1440px] mx-auto py-6">
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant font-body">
            <Link to="/" className="hover:text-primary transition-colors">Marché</Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <span className="text-foreground font-medium">{product.name}</span>
          </nav>
        </div>

        {/* Product Hero */}
        <section className="px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative rounded-xl overflow-hidden aspect-square"
            >
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              {product.badge && (
                <div className={`absolute top-6 left-6 ${product.badgeColor} px-4 py-2 rounded-full text-xs font-headline font-extrabold uppercase tracking-widest`}>
                  {product.badge}
                </div>
              )}
              <div className="absolute bottom-6 left-6 bg-card/90 backdrop-blur-xl px-4 py-3 rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">eco</span>
                <span className="text-sm font-headline font-bold">{product.traceability.methode}</span>
              </div>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-headline font-bold uppercase tracking-widest">
                  {product.region}
                </span>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-headline font-bold uppercase tracking-widest">
                  {product.traceability.certification}
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tighter mb-4">{product.name}</h1>

              <p className="text-lg text-on-surface-variant font-body leading-relaxed mb-8">{product.description}</p>

              <div className="flex items-end gap-4 mb-8">
                <div>
                  <div className="text-sm text-on-surface-variant">{product.unit}</div>
                  <div className="text-4xl font-headline font-extrabold">{product.price}</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary font-headline font-bold">
                  <span className="material-symbols-outlined text-lg">local_shipping</span>
                  Livraison 24h
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-4 mb-12">
                <button className="flex-1 min-w-[200px] bg-primary-container text-primary-container-foreground px-8 py-5 rounded-full font-headline font-extrabold text-lg flex items-center justify-center gap-3 hover:scale-[0.97] transition-transform shadow-xl">
                  <span className="material-symbols-outlined">add_shopping_cart</span>
                  Ajouter au Panier
                </button>
                <button className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-tertiary/20 transition-colors">
                  <span className="material-symbols-outlined">favorite</span>
                </button>
                <button className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>

              {/* Nutrition */}
              <div className="bg-surface-container-lowest rounded-xl p-6">
                <h3 className="text-sm font-headline font-extrabold uppercase tracking-widest text-on-surface-variant mb-4">
                  Valeurs Nutritionnelles
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(product.nutrition).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-lg font-headline font-extrabold">{value}</div>
                      <div className="text-xs text-on-surface-variant capitalize">
                        {key === "vitamineA" ? "Vitamine A" : key}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Traceability Timeline */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <div className="mb-12">
              <span className="text-primary font-headline font-extrabold text-sm uppercase tracking-widest">Du Champ à Votre Table</span>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mt-2">Traçabilité Complète</h2>
              <div className="h-1.5 w-32 bg-primary-container mt-4" />
            </div>
          </motion.div>

          <div className="bg-surface-container-lowest rounded-xl p-8 md:p-12">
            {/* Origin info */}
            <div className="flex flex-wrap items-center gap-6 mb-10 pb-10 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">pin_drop</span>
                <div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Parcelle</div>
                  <div className="font-headline font-extrabold">{product.traceability.parcelle}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">compost</span>
                <div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Méthode</div>
                  <div className="font-headline font-extrabold">{product.traceability.methode}</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
              {traceSteps.map((step, i) => (
                <motion.div
                  key={step.label}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="relative group"
                >
                  <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors duration-300">
                    <span className="material-symbols-outlined text-2xl">{step.icon}</span>
                  </div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-1">{step.label}</div>
                  <div className="text-sm font-headline font-bold">{step.value}</div>
                  {i < traceSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-7 left-16 w-[calc(100%-4rem)] h-[2px] bg-border" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Producer Section */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <div className="bg-inverse-surface rounded-xl p-8 md:p-16 flex flex-col lg:flex-row items-center gap-12">
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-primary-container flex-shrink-0">
                <img src={product.farmerImage} alt={product.farmer} className="w-full h-full object-cover" />
              </div>
              <div className="text-surface flex-1">
                <span className="text-primary-container font-headline font-extrabold text-sm uppercase tracking-widest">Votre Producteur</span>
                <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter mt-2 mb-2">{product.farmer}</h2>
                <div className="flex items-center gap-2 text-inverse-on-surface mb-6">
                  <span className="material-symbols-outlined text-lg">storefront</span>
                  <span className="font-body">{product.farmName}</span>
                  <span className="mx-2">•</span>
                  <span className="material-symbols-outlined text-lg">pin_drop</span>
                  <span className="font-body">{product.location}</span>
                </div>
                <p className="text-lg text-inverse-on-surface font-body leading-relaxed mb-8 max-w-2xl">
                  {product.farmerBio}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div>
                    <div className="text-3xl font-headline font-extrabold text-primary-container">100%</div>
                    <div className="text-sm text-inverse-on-surface">Prix Équitable</div>
                  </div>
                  <div>
                    <div className="text-3xl font-headline font-extrabold text-primary-container">24h</div>
                    <div className="text-sm text-inverse-on-surface">Champ → Table</div>
                  </div>
                  <div>
                    <div className="text-3xl font-headline font-extrabold text-primary-container">0</div>
                    <div className="text-sm text-inverse-on-surface">Intermédiaires</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl md:text-5xl font-headline font-extrabold tracking-tighter">Vous Aimerez Aussi</h2>
              <div className="h-1.5 w-32 bg-primary-container mt-4" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {related.map((p, i) => (
                <motion.div
                  key={p.id}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <Link to={`/produit/${p.id}`} className="group bg-surface-container-lowest rounded-lg overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-500 block">
                    <div className="relative h-56 overflow-hidden">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      {p.badge && (
                        <div className={`absolute top-4 left-4 ${p.badgeColor} px-3 py-1 rounded-full text-[10px] font-headline font-extrabold uppercase tracking-widest`}>
                          {p.badge}
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-headline font-extrabold">{p.name}</h3>
                      <div className="text-xs text-on-surface-variant font-body mt-1">
                        <span className="font-bold text-primary">{p.farmer}</span> • {p.location}
                      </div>
                      <div className="mt-4 flex justify-between items-end">
                        <div>
                          <div className="text-sm text-on-surface-variant">{p.unit}</div>
                          <div className="text-2xl font-headline font-extrabold">{p.price}</div>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
