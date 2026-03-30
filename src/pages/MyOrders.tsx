import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-tertiary/20 text-tertiary-foreground" },
  confirmed: { label: "Confirmée", color: "bg-primary-container/20 text-primary" },
  preparing: { label: "En préparation", color: "bg-primary-container/20 text-primary" },
  shipped: { label: "En livraison", color: "bg-primary/20 text-primary" },
  delivered: { label: "Livrée", color: "bg-primary-container text-primary-container-foreground" },
  cancelled: { label: "Annulée", color: "bg-destructive/10 text-destructive" },
};

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("buyer_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setOrders(data); setLoading(false); });
  }, [user]);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-24 px-4 md:px-12 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tighter mb-6">Mes Commandes</h1>

        {loading ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">receipt_long</span>
            <p className="font-headline font-bold text-lg mb-2">Aucune commande</p>
            <p className="text-on-surface-variant text-sm mb-6">Vos commandes apparaîtront ici.</p>
            <Link to="/" className="inline-block bg-primary-container text-primary-container-foreground px-6 py-3 rounded-full font-headline font-bold text-sm hover:scale-95 transition-transform">
              Découvrir le Marché
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => {
              const s = statusLabels[order.status] || statusLabels.pending;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl p-5 md:p-6 border border-border/30"
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                        Commande #{order.id.slice(0, 8)}
                      </div>
                      <div className="text-xl md:text-2xl font-headline font-extrabold mt-1">{formatPrice(order.total)}</div>
                      <div className="text-sm text-on-surface-variant mt-1">
                        {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <span className={`self-start px-3 py-1.5 rounded-full text-xs font-bold ${s.color}`}>{s.label}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">payments</span>
                      {order.payment_method === "wave" ? "Wave" : "Orange Money"}
                    </span>
                    {order.shipping_city && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {order.shipping_city}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MyOrders;
