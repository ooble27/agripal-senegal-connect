import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

const Navbar = () => {
  const { totalItems, setIsOpen } = useCart();

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(45,47,46,0.06)]">
      <div className="flex justify-between items-center px-8 py-4 max-w-[1440px] mx-auto w-full">
        <Link to="/" className="text-2xl font-black tracking-tighter text-foreground font-headline">
          Agrumen
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground hover:scale-95 transition-transform duration-200">
            Market
          </Link>
          <Link to="/devenir-producteur" className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground hover:scale-95 transition-transform duration-200">
            Artisans
          </Link>
          <a href="#" className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground hover:scale-95 transition-transform duration-200">
            Notre Histoire
          </a>
          <a href="#" className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:text-foreground hover:scale-95 transition-transform duration-200">
            Journal
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="font-headline font-extrabold uppercase tracking-tight text-sm text-on-surface-variant hover:scale-95 transition-transform px-4 py-2">
            Connexion
          </Link>
          <button
            onClick={() => setIsOpen(true)}
            className="relative bg-primary-container text-primary-container-foreground font-headline font-extrabold uppercase tracking-tight text-sm px-6 py-2 rounded-full hover:scale-95 transition-transform duration-200"
          >
            Panier
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-tertiary text-tertiary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
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
