import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

/** Protège les routes de l'app : redirige vers /connexion si non connecté. */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Le temps que la session Supabase se charge, on garde le fond de l'app
  // sans logo ni indicateur — l'attente est courte et un splash saccade
  // l'ouverture de la plateforme.
  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!user) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
};

export default RequireAuth;
