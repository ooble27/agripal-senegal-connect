import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

/**
 * Protège le back-office : réservé à l'équipe (utilisateurs ayant au moins un
 * rôle dans `user_roles`). Un client connecté sans rôle est renvoyé vers l'app.
 */
const RequireStaff = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isStaff, rolesLoading } = useAuth();

  // On attend la session ET les rôles avant de décider (évite un flash).
  if (loading || rolesLoading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!user) {
    return <Navigate to="/connexion" replace />;
  }
  if (!isStaff) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
};

export default RequireStaff;
