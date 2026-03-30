import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import waveLogo from "@/assets/wave-logo.png";
import orangeMoneyLogo from "@/assets/orange-money-logo.png";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Checkout = () => {
  const { user, loading: authLoading } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dakar");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wave");
  const [loading, setLoading] = useState(false);

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && items.length === 0) navigate("/");
  }, [authLoading, user, items.length]);

  if (authLoading || !user || items.length === 0) return null;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: order, error: orderErr } = await supabase.from("orders").insert({
        buyer_id: user.id,
        total: totalPrice,
        shipping_address: address,
        shipping_city: city,
        phone,
        payment_method: paymentMethod,
      }).select().single();
      if (orderErr) throw orderErr;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        shop_id: item.shopId,
        quantity: item.quantity,
        unit_price: item.priceNum,
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
      <main className="pt-24 pb-24 px-4 md:px-12 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tighter mb-6">Finaliser ma commande</h1>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <form onSubmit={handleOrder} className="lg:col-span-3 space-y-5">
              <div className="bg-card rounded-2xl p-5 md:p-6 space-y-4">
                <h2 className="text-base font-headline font-extrabold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                  Adresse de livraison
                </h2>
                <input value={address} onChange={e => setAddress(e.target.value)} required placeholder="Adresse complète" className="w-full bg-surface-container-low rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={city} onChange={e => setCity(e.target.value)} required placeholder="Ville" className="w-full bg-surface-container-low rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                  <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="Téléphone (77 000 00 00)" type="tel" className="w-full bg-surface-container-low rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-primary-container text-sm" />
                </div>
              </div>

              <div className="bg-card rounded-2xl p-5 md:p-6 space-y-4">
                <h2 className="text-base font-headline font-extrabold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">payments</span>
                  Mode de paiement
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("wave")}
                    className={`p-4 rounded-xl border-2 font-bold text-center transition-all text-sm flex flex-col items-center gap-2 ${paymentMethod === "wave" ? "border-primary bg-primary-container/10" : "border-border"}`}
                  >
                    <img src={waveLogo} alt="Wave" className="w-10 h-10 rounded-full object-cover" />
                    Wave
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("orange_money")}
                    className={`p-4 rounded-xl border-2 font-bold text-center transition-all text-sm flex flex-col items-center gap-2 ${paymentMethod === "orange_money" ? "border-primary bg-primary-container/10" : "border-border"}`}
                  >
                    <img src={orangeMoneyLogo} alt="Orange Money" className="w-10 h-10 rounded-full object-cover" />
                    Orange Money
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Après validation, vous recevrez une notification pour confirmer le paiement.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-container text-primary-container-foreground py-4 md:py-5 rounded-full font-headline font-extrabold text-lg hover:scale-[0.97] transition-transform disabled:opacity-50 shadow-xl"
              >
                {loading ? "Traitement..." : `Payer ${formatPrice(totalPrice)}`}
              </button>
            </form>

            {/* Summary */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl p-5 md:p-6 sticky top-24">
                <h2 className="text-base font-headline font-extrabold mb-4">Récapitulatif</h2>
                <div className="space-y-3 mb-5">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">{item.name} × {item.quantity}</span>
                      <span className="font-bold">{formatPrice(item.priceNum * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Sous-total</span>
                    <span className="font-bold">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Livraison</span>
                    <span className="font-bold text-primary">Gratuite</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
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
