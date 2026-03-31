import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, totalPrice, totalItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatPrice = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  const handleCheckout = () => {
    setIsOpen(false);
    if (!user) {
      navigate("/auth");
    } else {
      navigate("/checkout");
    }
  };

  const deliveryFee = 1500;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/20">
          <div className="flex items-center justify-between">
            <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-on-surface">arrow_back</span>
            </button>
            <SheetTitle className="font-headline font-extrabold text-lg">Mon Panier</SheetTitle>
            <button className="w-10 h-10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant">shopping_bag</span>
            </button>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/40 mb-4">shopping_cart</span>
            <p className="font-headline font-extrabold text-xl mb-2">Panier vide</p>
            <p className="text-on-surface-variant text-sm mb-6">Découvrez nos produits frais du terroir sénégalais.</p>
            <button
              onClick={() => setIsOpen(false)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-headline font-bold text-sm hover:scale-95 transition-transform"
            >
              Explorer le Marché
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-3 items-center py-3"
                  >
                    {/* Circular product image */}
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-container-low shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-headline font-extrabold text-sm truncate">{item.name}</h4>
                      <p className="text-[11px] text-on-surface-variant">{item.unit}</p>
                      <p className="text-sm font-headline font-bold text-primary mt-0.5">{item.price} <span className="text-on-surface-variant font-normal text-[10px]">/{item.unit}</span></p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-on-surface-variant hover:text-destructive transition-colors shrink-0 mr-1"
                    >
                      <span className="material-symbols-outlined text-lg">delete_outline</span>
                    </button>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-0 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full border border-border/40 flex items-center justify-center hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-8 text-center font-headline font-bold text-sm">
                        {String(item.quantity).padStart(2, "0")}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="border-t border-border/20 px-5 py-5 space-y-4">
              {/* Coupon hint */}
              <div className="flex items-center justify-between bg-surface-container-lowest rounded-full px-4 py-3 border border-primary/20">
                <div className="flex items-center gap-2 text-sm font-headline font-bold text-primary">
                  <span className="material-symbols-outlined text-base">confirmation_number</span>
                  Code promo disponible
                </div>
                <button className="text-xs font-bold text-primary border border-primary rounded-full px-3 py-1">
                  Appliquer
                </button>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Sous-total</span>
                  <span className="font-headline font-bold">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Livraison</span>
                  <span className="font-headline font-bold">{formatPrice(deliveryFee)}</span>
                </div>
                <div className="h-px bg-border/30 my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-headline font-extrabold text-base">Total</span>
                  <span className="font-headline font-extrabold text-xl text-primary">{formatPrice(totalPrice + deliveryFee)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-primary text-primary-foreground py-4 rounded-full font-headline font-extrabold text-base flex items-center justify-center gap-2 hover:scale-[0.97] transition-transform shadow-lg"
              >
                Commander
              </button>

              <button
                onClick={clearCart}
                className="w-full text-center text-xs text-on-surface-variant hover:text-destructive font-headline font-bold transition-colors"
              >
                Vider le panier
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
