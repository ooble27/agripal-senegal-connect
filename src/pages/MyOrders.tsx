import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "En attente", color: "bg-tertiary/20 text-tertiary-foreground", icon: "schedule" },
  confirmed: { label: "Confirmée", color: "bg-primary-container/20 text-primary", icon: "check_circle" },
  preparing: { label: "En préparation", color: "bg-primary-container/20 text-primary", icon: "inventory_2" },
  shipped: { label: "En livraison", color: "bg-primary/20 text-primary-foreground", icon: "local_shipping" },
  delivered: { label: "Livrée", color: "bg-primary-container text-primary-container-foreground", icon: "done_all" },
  cancelled: { label: "Annulée", color: "bg-destructive/10 text-destructive", icon: "cancel" },
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
      <main className="pt-28 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-headline font-extrabold tracking-tighter mb-10">Mes Commandes</h1>

        {loading ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest rounded-3xl">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/40 mb-4">receipt_long</span>
            <p className="font-headline font-bold text-xl mb-2">Aucune commande</p>
            <p className="text-on-surface-variant text-sm">Vos commandes apparaîtront ici après votre premier achat.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const s = statusLabels[order.status] || statusLabels.pending;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-surface-container-lowest rounded-3xl p-7"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.15em] font-bold">
                        Commande #{order.id.slice(0, 8)}
                      </div>
                      <div className="text-2xl font-headline font-extrabold mt-1">{formatPrice(order.total)}</div>
                      <div className="text-xs text-on-surface-variant mt-1">
                        {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${s.color}`}>
                      <span className="material-symbols-outlined text-sm">{s.icon}</span>
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-5 text-sm text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">payments</span>
                      {order.payment_method === "wave" ? "Wave" : "Orange Money"}
                    </span>
                    {order.shipping_city && (
                      <span className="flex items-center gap-1.5">
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
