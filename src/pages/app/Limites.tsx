import AppShell from "@/components/app/AppShell";
import LimitsCard from "@/components/app/LimitsCard";
import { useT } from "@/lib/i18n";

/** Limites d'achat et de vente sur 24 heures, ouvertes depuis Mon compte. */
const Limites = () => {
  const t = useT();
  return (
    <AppShell
      backTo="/app/compte"
      header={
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight">{t("acct.limits")}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("acct.limitsPage")}</p>
        </div>
      }
    >
      <LimitsCard />
    </AppShell>
  );
};

export default Limites;
