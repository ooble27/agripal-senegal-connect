import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const location = useLocation();
  const { totalItems, setIsOpen } = useCart();
  const { user, role } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Hide on landing page and dashboard/seller pages
  if (location.pathname === "/" || location.pathname.startsWith("/dashboard")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border/20">
      <div className="flex items-center justify-around px-2 pt-2 pb-2 safe-area-bottom">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-colors min-w-[60px] ${
            isActive("/") ? "bg-primary-container" : ""
          }`}
        >
          <span
            className={`material-symbols-outlined text-xl ${isActive("/") ? "text-on-primary-container" : "text-on-surface-variant"}`}
            style={isActive("/") ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            home
          </span>
          <span className={`text-[10px] font-bold ${isActive("/") ? "text-on-primary-container" : "text-on-surface-variant"}`}>
            Accueil
          </span>
        </Link>

        {/* Marché */}
        <Link
          to="/marche"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-colors min-w-[60px] ${
            isActive("/marche") ? "bg-primary-container" : ""
          }`}
        >
          <span
            className={`material-symbols-outlined text-xl ${isActive("/marche") ? "text-on-primary-container" : "text-on-surface-variant"}`}
            style={isActive("/marche") ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            storefront
          </span>
          <span className={`text-[10px] font-bold ${isActive("/marche") ? "text-on-primary-container" : "text-on-surface-variant"}`}>
            Marché
          </span>
        </Link>

        {/* Cart */}
        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-colors min-w-[60px] relative"
        >
          <span className="material-symbols-outlined text-xl text-on-surface-variant">shopping_cart</span>
          {totalItems > 0 && (
            <span className="absolute top-0.5 right-2 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
          <span className="text-[10px] font-bold text-on-surface-variant">Panier</span>
        </button>

        {/* Profile */}
        <Link
          to={user ? (role === "seller" ? "/dashboard" : "/mon-compte") : "/auth"}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-colors min-w-[60px] ${
            isActive("/mon-compte") || isActive("/auth") ? "bg-primary-container" : ""
          }`}
        >
          <span
            className={`material-symbols-outlined text-xl ${
              isActive("/mon-compte") || isActive("/auth") ? "text-on-primary-container" : "text-on-surface-variant"
            }`}
            style={isActive("/mon-compte") || isActive("/auth") ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            person
          </span>
          <span className={`text-[10px] font-bold ${
            isActive("/mon-compte") || isActive("/auth") ? "text-on-primary-container" : "text-on-surface-variant"
          }`}>
            Profil
          </span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
