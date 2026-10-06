import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ChevronRight, Clock } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getMyProfile, type MyProfile } from "@/lib/profile";
import { useT } from "@/lib/i18n";

/** Vrai si le compte est une entreprise dont la vérification n'est pas validée. */
export const businessBlocked = (p: MyProfile | null) => p?.accountType === "business" && p.businessStatus !== "approved";

/**
 * Bloque l'achat et la vente pour un compte entreprise non vérifié (Conditions,
 * partie 5). La base refuse aussi l'ordre : cet écran évite seulement de
 * remplir un formulaire pour rien.
 */
const BusinessGate = ({ children }: { children: React.ReactNode }) => {
  const t = useT();
  const { isStaff } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null | undefined>(undefined);

  useEffect(() => {
    getMyProfile().then(setProfile);
  }, []);

  if (profile === undefined) return null;
  if (isStaff || !businessBlocked(profile)) return <>{children}</>;

  const pending = profile!.businessStatus === "pending";
  return (
    <AppShell backTo="/app" header={<h1 className="font-display text-[22px] font-semibold tracking-tight">{t("kyb.gateTitle")}</h1>}>
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground/70">
          {pending ? <Clock className="h-6 w-6" strokeWidth={1.6} /> : <Building2 className="h-6 w-6" strokeWidth={1.6} />}
        </span>
        <p className="mt-4 max-w-[340px] text-[14px] leading-relaxed text-muted-foreground">
          {pending ? t("kyb.gatePending") : t("kyb.gateSub")}
        </p>
        <Button asChild variant="appSolid" shape="rounded" className="mt-6 gap-2 px-5 text-[13px]">
          <Link to="/app/entreprise">
            {pending ? t("kyb.gateView") : t("kyb.gateCta")} <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </AppShell>
  );
};

export default BusinessGate;
