import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { path: "/", icon: "home", label: "Accueil" },
  { path: "/marche", icon: "storefront", label: "Marché" },
  { path: "__cart__", icon: "shopping_cart", label: "Panier" },
  { path: "__profile__", icon: "person", label: "Profil" },
];

const BottomNav = () => {
  const location = useLocation();
  const { totalItems, setIsOpen } = useCart();
  const { user, role } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  if (location.pathname === "/" || location.pathname.startsWith("/dashboard")) return null;

  const getProfilePath = () => (user ? (role === "seller" ? "/dashboard" : "/mon-compte") : "/auth");
  const isProfileActive = isActive("/mon-compte") || isActive("/auth");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border/20">
      <div className="flex items-center justify-around px-2 pt-2 pb-2 safe-area-bottom">
        {navItems.map((item) => {
          const isCart = item.path === "__cart__";
          const isProfile = item.path === "__profile__";
          const active = isCart ? false : isProfile ? isProfileActive : isActive(item.path);
          const href = isCart ? "#" : isProfile ? getProfilePath() : item.path;

          const content = (
            <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl min-w-[60px] relative">
              {active && (
                <motion.div
                  layoutId="bottomnav-pill"
                  className="absolute inset-0 bg-primary-container rounded-2xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className={`material-symbols-outlined text-xl relative z-10 ${active ? "text-on-primary-container" : "text-on-surface-variant"}`}
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {isCart && totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0.5 right-2 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center z-20"
                >
                  {totalItems}
                </motion.span>
              )}
              <span className={`text-[10px] font-bold relative z-10 ${active ? "text-on-primary-container" : "text-on-surface-variant"}`}>
                {item.label}
              </span>
            </div>
          );

          if (isCart) {
            return (
              <button key={item.path} onClick={() => setIsOpen(true)} className="transition-colors">
                {content}
              </button>
            );
          }

          return (
            <Link key={item.path} to={href} className="transition-colors">
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
