import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const { totalItems, setIsOpen } = useCart();
  const { user, role, signOut } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
      <div className="flex justify-between items-center px-8 py-4 max-w-[1440px] mx-auto w-full">
        <Link to="/" className="text-xl font-black tracking-tighter text-foreground font-headline">
          Agrumen<span className="text-primary">.</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="font-headline font-bold uppercase tracking-tight text-[11px] text-on-surface-variant hover:text-foreground transition-colors">
            Market
          </Link>
          <Link to="/devenir-producteur" className="font-headline font-bold uppercase tracking-tight text-[11px] text-on-surface-variant hover:text-foreground transition-colors">
            Artisans
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {role === "seller" ? (
                <Link to="/dashboard" className="font-headline font-bold uppercase tracking-tight text-[11px] text-on-surface-variant hover:text-foreground px-3 py-2">
                  Ma Boutique
                </Link>
              ) : (
                <Link to="/mes-commandes" className="font-headline font-bold uppercase tracking-tight text-[11px] text-on-surface-variant hover:text-foreground px-3 py-2">
                  Commandes
                </Link>
              )}
              <button onClick={() => signOut()} className="text-on-surface-variant hover:text-destructive px-2 py-2">
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            </>
          ) : (
            <Link to="/auth" className="font-headline font-bold uppercase tracking-tight text-[11px] text-on-surface-variant hover:text-foreground px-3 py-2">
              Sign In
            </Link>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className="relative bg-primary-container text-primary-container-foreground font-headline font-extrabold uppercase tracking-tight text-[11px] px-5 py-2 rounded-full hover:scale-95 transition-transform"
          >
            Cart
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-tertiary text-tertiary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
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
