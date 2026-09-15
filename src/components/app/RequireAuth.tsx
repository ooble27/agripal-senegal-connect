import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

/** Protège les routes de l'app : redirige vers /connexion si non connecté. */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Tant que la session Supabase se charge, on n'affiche rien (évite un flash
  // de redirection avant que la session soit connue).
  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!user) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
};

export default RequireAuth;
