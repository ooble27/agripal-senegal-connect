import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const { totalItems, setIsOpen } = useCart();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl">
      <div className="flex justify-between items-center px-8 py-5 max-w-[1440px] mx-auto w-full">
        <Link to="/" className="text-xl font-black tracking-tighter text-foreground font-headline">
          Agrumen
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="font-headline font-bold text-sm text-on-surface-variant hover:text-foreground transition-colors">
            Marché
          </Link>
          <Link to="/devenir-producteur" className="font-headline font-bold text-sm text-on-surface-variant hover:text-foreground transition-colors">
            Producteurs
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {role === "seller" ? (
                <Link to="/dashboard" className="font-headline font-bold text-sm text-on-surface-variant hover:text-foreground transition-colors px-3 py-2">
                  Ma Boutique
                </Link>
              ) : (
                <Link to="/mes-commandes" className="font-headline font-bold text-sm text-on-surface-variant hover:text-foreground transition-colors px-3 py-2">
                  Mes Commandes
                </Link>
              )}
              <button onClick={() => signOut()} className="text-on-surface-variant hover:text-destructive p-2 rounded-full hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-xl">logout</span>
              </button>
            </>
          ) : (
            <Link to="/auth" className="font-headline font-bold text-sm text-on-surface-variant hover:text-foreground transition-colors px-3 py-2">
              Connexion
            </Link>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className="relative bg-primary-container text-primary-container-foreground font-headline font-bold text-sm px-6 py-2.5 rounded-full hover:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-lg align-middle mr-1">shopping_cart</span>
            Panier
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
