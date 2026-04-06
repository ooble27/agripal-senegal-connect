import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
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
            <div className="flex flex-col items-center gap-0.5 px-4 py-1.5 min-w-[64px] relative">
              <span
                className={`material-symbols-outlined text-[22px] transition-all duration-300 ${active ? "text-primary scale-110" : "text-on-surface-variant"}`}
                style={active ? { fontVariationSettings: "'FILL' 1, 'wght' 600" } : {}}
              >
                {item.icon}
              </span>
              {isCart && totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-3 w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center z-20"
                >
                  {totalItems}
                </motion.span>
              )}
              <span className={`text-[10px] font-medium transition-colors duration-300 ${active ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                {item.label}
              </span>
              {active && (
                <motion.div
                  layoutId="bottomnav-dot"
                  className="w-1 h-1 rounded-full bg-primary mt-0.5"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
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
