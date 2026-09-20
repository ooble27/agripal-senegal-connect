import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";

/** Protège les routes de l'app : redirige vers /connexion si non connecté. */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Tant que la session Supabase se charge, on affiche un logo pulsé — pas un
  // écran vide — pour que l'utilisateur voit que la plateforme charge.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse opacity-60">
          <Logo />
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
};

export default RequireAuth;
