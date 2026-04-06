import { Link } from "react-router-dom";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const { totalItems, setIsOpen } = useCart();
  const { user, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(45,47,46,0.06)] safe-area-top">
      <div className="flex justify-between items-center px-5 md:px-8 py-3 md:py-4 max-w-[1440px] mx-auto w-full">
        <Link to="/" className="text-2xl font-black tracking-tighter text-foreground font-headline">
          Agrumen
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/marche" className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground hover:scale-95 transition-transform duration-200">
            Marché
          </Link>
          {user && role === "seller" && (
            <Link to="/dashboard" className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground hover:scale-95 transition-transform duration-200">
              Mes Produits
            </Link>
          )}
          {user && role === "buyer" && (
            <Link to="/mon-compte" className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground hover:scale-95 transition-transform duration-200">
              Mon Compte
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop auth links */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <button onClick={() => signOut()} className="font-headline font-bold text-sm text-on-surface-variant hover:text-destructive px-3 py-2">
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            ) : (
              <Link to="/auth" className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:scale-95 transition-transform px-4 py-2">
                Connexion
              </Link>
            )}
          </div>

          {/* Cart button - desktop only */}
          <button
            onClick={() => setIsOpen(true)}
            className="hidden md:flex relative bg-primary-container text-primary-container-foreground font-headline font-extrabold uppercase tracking-tight text-sm px-5 md:px-6 py-2 rounded-full hover:scale-95 transition-transform duration-200"
          >
            Panier
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-tertiary text-tertiary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
            aria-label="Menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col px-6 py-4 gap-1">
            <Link to="/marche" onClick={() => setMobileOpen(false)} className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground py-3 border-b border-border/20">
              Marché
            </Link>
            {user ? (
              <>
                {role === "seller" ? (
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground py-3 border-b border-border/20">
                    Mes Produits
                  </Link>
                ) : (
                  <Link to="/mon-compte" onClick={() => setMobileOpen(false)} className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground py-3 border-b border-border/20">
                    Mon Compte
                  </Link>
                )}
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="font-headline font-bold text-sm text-destructive text-left py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Déconnexion
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="font-headline font-extrabold uppercase tracking-tight text-sm text-primary py-3">
                Connexion
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
