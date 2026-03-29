import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const chartData = [
  { name: "01", value: 12000 },
  { name: "05", value: 28000 },
  { name: "08", value: 18000 },
  { name: "12", value: 45000 },
  { name: "16", value: 22000 },
  { name: "19", value: 14000 },
  { name: "22", value: 32000 },
  { name: "25", value: 38000 },
  { name: "28", value: 25000 },
  { name: "30", value: 18000 },
];

const inventory = [
  { name: "Carottes", qty: "500 kg", status: "En vente", statusColor: "bg-primary-container/20 text-primary", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB_im8t9eHX9sSEL550E3rqREzP_Bid_1wuyIJY-DIDwOVIjjLodY0gL-7oHw2pvmCh-PBhsxW-DsDUyWygq34sMgDpQRQsHjK3BEMAGUG18E1sqFcvYoYQFb2AfuH0Nkt-BLvZ0SApDPl5A6t_lxbuaf5cqijxU9tUwg3oohwe6LoXsK9tcfvaE1zS4rEF25kc1IjtMPgdnyeQlf6ZlclbuySAjo0W98KyeTTgSoe1OmSb6ZinewTtdx1g7HsrSUpM0c3zLYaeRQvK" },
  { name: "Tomates", qty: "200 kg", status: "Stock faible", statusColor: "bg-destructive/10 text-destructive", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuClfPVlUTfPLF2fzexdu5Kxu2fEvlM9A8-TWnOeDv0Hvfz6udNsPoNElslVWkby6nYGigIo14SzHMPxouU0El0J3BIeSDACILRdfsjKgLzB0F4xW2GpVISS9d-eGTbv4vZ9PkuL2okhdWH_gsu0ClaNWQDFelMBZTbBRQHbdJgfWPD5ms03kRN6OxsKp3-JIMhIleZDa6EKZqKQMHdyB_eK_Rva_0zKn1ee37YHOEzl85a3KVoO1k4_MFRqzQ9mrvWWZR-ZPhhMZEld" },
  { name: "Oignons", qty: "150 kg", status: "Épuisé", statusColor: "bg-surface-dim text-outline", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCpWl5WDVVz_ZdH05ubZqhie4oUKVXPFcN7_iNvlDV2F2ruWpCFoJmVURvISFYwfrlM7UXXAbwGahQLqgngtsmFIMuXWrULsc8RbFdWr-iNA_qK_oTA1sFsM6SXhrdLlfCYoS2M7kZmr7WT6lCQ2WTkiKejEmJTM7rYt8yxLxaa5ESlD3XUibdmcNgyyTE-sbXSDDdHn67uXxXHvU-Kd3BihJ6jYQtzKEVxeVYmIg3IK5mvHrXRnIdso8dF8k0T4S2ms_NcRuEfoei9" },
];

const sales = [
  { initials: "AD", name: "Amadou Diallo", product: "Carottes (50kg)", amount: "25.000 FCFA", time: "Il y a 2h", color: "bg-secondary/20 text-secondary" },
  { initials: "FK", name: "Fatou Kane", product: "Tomates (20kg)", amount: "12.500 FCFA", time: "Il y a 5h", color: "bg-tertiary/20 text-tertiary-foreground" },
  { initials: "BS", name: "Babacar Sarr", product: "Carottes (100kg)", amount: "48.000 FCFA", time: "Hier", color: "bg-primary-container/30 text-primary" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-background font-headline flex flex-col p-6 gap-8 z-50 border-r border-border/30">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-primary tracking-tight">Exploitation Agricole</span>
          <span className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">Producteur Vérifié</span>
        </div>
        <nav className="flex flex-col gap-2 flex-grow">
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-primary-container-foreground font-bold bg-primary-container rounded-xl transition-all">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Vue d'ensemble</span>
          </a>
          {[
            { icon: "eco", label: "Mes Récoltes" },
            { icon: "trending_up", label: "Ventes" },
            { icon: "payments", label: "Paiements" },
            { icon: "settings", label: "Paramètres" },
          ].map((item) => (
            <a key={item.label} href="#" className="flex items-center gap-3 px-4 py-3 text-primary/70 hover:text-primary hover:bg-surface-container-low rounded-xl transition-all duration-200">
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <button className="mt-auto w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined">add_circle</span>
          Nouvelle Récolte
        </button>
      </aside>

      {/* Top bar */}
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] z-40 bg-background/70 backdrop-blur-xl flex justify-between items-center px-12 py-6">
        <h1 className="text-xl font-semibold text-primary font-headline">Tableau de Bord</h1>
        <div className="flex items-center gap-8">
          <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/10">
            <span className="material-symbols-outlined text-outline">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-sm font-medium w-64 outline-none ml-2" placeholder="Rechercher une commande..." type="text" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-outline uppercase tracking-tighter">Solde disponible</span>
              <span className="text-primary font-black">1.250.000 FCFA</span>
            </div>
            <button className="p-2 hover:bg-surface-container rounded-full transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
            </button>
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary-container">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmmwiZ756u50CnurpOfYWRHCgUoShcMfJZZYj4iHa70e-hUiB9E2fYmab38aoQex-r4J7_WzceKtle_QOfnTVLLIxAsB-xo8a0R4gDTeDDdDOVUKFCTJ48VoecidhaXWZSlewGV1RNKJT5k9GDoG3cggKhMmEpbigGUcYql0qDm9fCK3ymTU3HLDe3KHDOjewJgjGa33DEtEsROtfKCRWc_T9T9B8aKRpo6wMPvhENGDHmnm3BjqXke8VQzsfuoHTqip-RgeKD_uW_"
                alt="Profile"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="ml-64 pt-32 px-12 pb-12 min-h-screen">
        {/* Welcome */}
        <section className="mb-12">
          <h2 className="text-4xl font-extrabold tracking-tight mb-2">Bonjour, Moussa Diop</h2>
          <p className="text-on-surface-variant flex items-center gap-2 text-lg">
            <span className="material-symbols-outlined text-primary">potted_plant</span>
            Ferme Keur Moussa — Prêt pour les récoltes du jour ?
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-primary-container p-8 rounded-xl flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-primary-container-foreground text-3xl">account_balance_wallet</span>
              <span className="text-primary-container-foreground/60 text-xs font-bold uppercase">Solde Actuel</span>
            </div>
            <div>
              <div className="text-3xl font-black text-primary-container-foreground">1.250.000</div>
              <div className="text-primary-container-foreground/80 font-bold">FCFA</div>
            </div>
          </div>
          <div className="bg-card p-8 rounded-xl flex flex-col justify-between h-48 border border-outline-variant/5">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-primary text-3xl">trending_up</span>
              <span className="text-outline text-xs font-bold uppercase">Ventes du mois</span>
            </div>
            <div>
              <div className="text-3xl font-black">450.000</div>
              <div className="text-outline font-bold">FCFA</div>
            </div>
          </div>
          <div className="bg-card p-8 rounded-xl flex flex-col justify-between h-48 border border-outline-variant/5">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-primary text-3xl">shopping_cart</span>
              <span className="text-outline text-xs font-bold uppercase">Commandes</span>
            </div>
            <div>
              <div className="text-3xl font-black">12</div>
              <div className="text-outline font-bold">En cours de livraison</div>
            </div>
          </div>
          <div className="bg-tertiary/10 p-8 rounded-xl flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined filled text-tertiary-foreground text-3xl">star</span>
              <span className="text-tertiary-foreground/60 text-xs font-bold uppercase">Note Producteur</span>
            </div>
            <div>
              <div className="text-3xl font-black text-tertiary-foreground">4.9/5</div>
              <div className="text-tertiary-foreground/80 font-bold">Excellent profil</div>
            </div>
          </div>
        </section>

        {/* Chart + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 bg-card p-8 rounded-xl border border-outline-variant/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">Aperçu des revenus (30 jours)</h3>
              <select className="bg-surface-container-low border-none rounded-lg text-sm font-semibold focus:ring-primary">
                <option>30 derniers jours</option>
                <option>7 derniers jours</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis hide />
                <Tooltip formatter={(value: number) => [`${(value / 1000).toFixed(0)}k FCFA`]} />
                <Bar dataKey="value" fill="hsl(78, 100%, 19%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-bold">Actions Rapides</h3>
            {[
              { icon: "add_box", title: "Ajouter un produit", desc: "Publier une nouvelle récolte" },
              { icon: "account_balance", title: "Demander un virement", desc: "Wave / Orange Money" },
              { icon: "support_agent", title: "Contacter le support", desc: "Aide et assistance technique" },
            ].map((action) => (
              <button key={action.title} className="flex items-center gap-4 p-6 bg-surface-container-low rounded-xl hover:bg-primary-container transition-colors group text-left">
                <span className="p-3 bg-card rounded-full group-hover:bg-primary-container-foreground group-hover:text-primary-container transition-colors">
                  <span className="material-symbols-outlined">{action.icon}</span>
                </span>
                <div>
                  <div className="font-bold">{action.title}</div>
                  <div className="text-xs text-outline">{action.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Inventory + Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <section>
            <div className="flex justify-between items-end mb-6">
              <h3 className="text-2xl font-bold tracking-tight">Gestion des Récoltes</h3>
              <button className="text-primary font-bold text-sm underline decoration-2 underline-offset-4">Mettre à jour le stock</button>
            </div>
            <div className="bg-card rounded-xl overflow-hidden border border-outline-variant/5">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-surface-container-low">
                    <th className="px-6 py-4 text-xs font-bold text-outline uppercase">Produit</th>
                    <th className="px-6 py-4 text-xs font-bold text-outline uppercase">Quantité</th>
                    <th className="px-6 py-4 text-xs font-bold text-outline uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {inventory.map((item) => (
                    <tr key={item.name} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden">
                          <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
                        </div>
                        <span className="font-bold">{item.name}</span>
                      </td>
                      <td className="px-6 py-4 font-medium">{item.qty}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 ${item.statusColor} text-xs font-bold rounded-full`}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end mb-6">
              <h3 className="text-2xl font-bold tracking-tight">Dernières Ventes</h3>
              <button className="text-outline font-bold text-sm hover:text-primary transition-colors">Voir tout</button>
            </div>
            <div className="flex flex-col gap-3">
              {sales.map((sale) => (
                <div key={sale.name} className="flex items-center justify-between p-4 bg-card rounded-xl border border-outline-variant/5">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${sale.color} flex items-center justify-center font-bold text-sm`}>{sale.initials}</div>
                    <div>
                      <div className="font-bold">{sale.name}</div>
                      <div className="text-xs text-outline">{sale.product}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-primary">{sale.amount}</div>
                    <div className="text-[10px] font-bold text-outline uppercase">{sale.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
