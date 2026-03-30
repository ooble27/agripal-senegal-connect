import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Checkout = () => {
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dakar");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wave");
  const [loading, setLoading] = useState(false);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  if (!user) { navigate("/auth"); return null; }
  if (items.length === 0) { navigate("/"); return null; }

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data: order, error: orderErr } = await supabase.from("orders").insert({
        buyer_id: user.id, total: totalPrice, shipping_address: address,
        shipping_city: city, phone, payment_method: paymentMethod,
      }).select().single();
      if (orderErr) throw orderErr;

      const orderItems = items.map(item => ({
        order_id: order.id, product_id: item.id, shop_id: item.shopId || "",
        quantity: item.quantity, unit_price: item.priceNum,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      clearCart();
      toast.success("Commande créée ! Procédez au paiement via " + (paymentMethod === "wave" ? "Wave" : "Orange Money"));
      navigate("/mes-commandes");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la commande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-24 px-6 md:px-12 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-headline font-extrabold tracking-tighter mb-10">Finaliser ma commande</h1>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <form onSubmit={handleOrder} className="lg:col-span-3 space-y-6">
              <div className="bg-surface-container-lowest rounded-3xl p-8 space-y-5">
                <h2 className="text-lg font-headline font-extrabold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  Adresse de livraison
                </h2>
                <input value={address} onChange={e => setAddress(e.target.value)} required placeholder="Adresse complète" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                <div className="grid grid-cols-2 gap-4">
                  <input value={city} onChange={e => setCity(e.target.value)} required placeholder="Ville" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="Téléphone" type="tel" className="w-full bg-surface-container-low rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-3xl p-8 space-y-5">
                <h2 className="text-lg font-headline font-extrabold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">payments</span>
                  Mode de paiement
                </h2>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("wave")}
                    className={`flex-1 p-5 rounded-3xl font-bold text-center transition-all ${paymentMethod === "wave" ? "bg-primary-container/20 ring-2 ring-primary" : "bg-surface-container-low"}`}
                  >
                    <div className="text-2xl mb-2">🌊</div>
                    <div className="text-sm font-headline font-bold">Wave</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("orange_money")}
                    className={`flex-1 p-5 rounded-3xl font-bold text-center transition-all ${paymentMethod === "orange_money" ? "bg-primary-container/20 ring-2 ring-primary" : "bg-surface-container-low"}`}
                  >
                    <div className="text-2xl mb-2">🍊</div>
                    <div className="text-sm font-headline font-bold">Orange Money</div>
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Après validation, vous recevrez une notification pour confirmer le paiement.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-container text-primary-container-foreground py-5 rounded-full font-headline font-extrabold text-lg hover:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {loading ? "Traitement..." : `Payer ${formatPrice(totalPrice)}`}
              </button>
            </form>

            <div className="lg:col-span-2">
              <div className="bg-surface-container-lowest rounded-3xl p-8 sticky top-28">
                <h2 className="text-lg font-headline font-extrabold mb-6">Récapitulatif</h2>
                <div className="space-y-4 mb-6">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">{item.name} × {item.quantity}</span>
                      <span className="font-bold">{formatPrice(item.priceNum * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Sous-total</span>
                    <span className="font-bold">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Livraison</span>
                    <span className="font-bold text-primary">Gratuite</span>
                  </div>
                  <div className="pt-3 flex justify-between">
                    <span className="font-headline font-extrabold text-lg">Total</span>
                    <span className="font-headline font-extrabold text-lg">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
