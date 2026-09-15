import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Rôles d'équipe de l'utilisateur (vide pour un client). */
  roles: AppRole[];
  /** A un rôle admin. */
  isAdmin: boolean;
  /** Fait partie de l'équipe (au moins un rôle) → accès back-office. */
  isStaff: boolean;
  /** Les rôles sont encore en cours de chargement. */
  rolesLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string, extra?: {
    accountType?: "individual" | "business";
    businessName?: string;
    businessNumber?: string;
    businessAddress?: string;
    businessPhone?: string;
  }) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  /** Envoie le courriel de réinitialisation de mot de passe. */
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  /** Définit un nouveau mot de passe (après clic sur le lien de réinitialisation). */
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Nom d'affichage depuis l'e-mail, si aucun nom n'a été fourni. */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] || "Ami";
  const clean = local.replace(/[._-]+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function toUser(session: Session | null): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  const email = u.email ?? "";
  const name = (u.user_metadata?.full_name as string | undefined)?.trim() || nameFromEmail(email);
  return { id: u.id, name, email };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    // Session initiale + abonnement aux changements (connexion, déconnexion,
    // rafraîchissement de jeton, confirmation d'e-mail…).
    supabase.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session));
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Charge les rôles d'équipe de l'utilisateur connecté (RLS : chacun voit les
  // siens). Un client sans rôle obtient un tableau vide → pas de back-office.
  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      setRoles([]);
      setRolesLoading(false);
      return;
    }
    let active = true;
    setRolesLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .then(({ data }) => {
        if (!active) return;
        setRoles((data ?? []).map((r) => r.role));
        setRolesLoading(false);
      });
    return () => { active = false; };
  }, [user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      roles,
      isAdmin: roles.includes("admin"),
      isStaff: roles.length > 0,
      rolesLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return error ? { error: error.message } : {};
      },
      signUp: async (email, password, name, extra) => {
        const meta: Record<string, string> = {
          full_name: name.trim() || nameFromEmail(email),
        };
        if (extra?.accountType) meta.account_type = extra.accountType;
        if (extra?.businessName) meta.business_name = extra.businessName;
        if (extra?.businessNumber) meta.business_number = extra.businessNumber;
        if (extra?.businessAddress) meta.business_address = extra.businessAddress;
        if (extra?.businessPhone) meta.business_phone = extra.businessPhone;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: meta,
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) return { error: error.message };
        return { needsConfirmation: !data.session };
      },
      sendPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reinitialiser`,
        });
        return error ? { error: error.message } : {};
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        return error ? { error: error.message } : {};
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [user, loading, roles, rolesLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
