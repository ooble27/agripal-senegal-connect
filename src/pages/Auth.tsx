import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get("role") === "seller" ? "seller" : "buyer";
  const [isLogin, setIsLogin] = useState(defaultRole === "buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">(defaultRole);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        if (data.user) {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
          const userRole = roles?.[0]?.role;
          toast.success("Connexion réussie !");
          navigate(userRole === "seller" ? "/dashboard" : "/");
        }
      } else {
        await signUp(email, password, fullName, role);
        toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
      }
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-headline font-extrabold tracking-tighter text-primary">Agrumen</h1>
          <p className="text-on-surface-variant mt-2">{isLogin ? "Connectez-vous à votre compte" : "Créez votre compte"}</p>
        </div>

        <div className="bg-card rounded-xl p-8 shadow-xl">
          {!isLogin && (
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`flex-1 py-3 rounded-xl font-headline font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  role === "buyer" ? "bg-primary-container text-primary-container-foreground" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                Acheteur
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`flex-1 py-3 rounded-xl font-headline font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  role === "seller" ? "bg-primary-container text-primary-container-foreground" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-lg">storefront</span>
                Vendeur
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Nom complet</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container"
                  placeholder="Prénom et Nom"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container"
                placeholder="votre@email.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-on-surface-variant mb-1 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-container"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-primary-container-foreground py-4 rounded-full font-headline font-extrabold text-lg hover:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {loading ? "Chargement..." : isLogin ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-bold ml-1 hover:underline">
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
