/**
 * Page de journal d'audit — thin wrapper autour du panneau réutilisable pour
 * pouvoir la router seule (ex : `/admin/journal`) sans passer par le portail.
 * Le rendu embarqué dans le portail vit dans `AdminPortal.tsx` (onglet Audit).
 */
import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";
import AuditLogPanel from "@/components/admin/AuditLogPanel";
import { T } from "@/lib/i18n";

const AuditLogPage = () => {
  return (
    <div className="app-surface app-type min-h-screen bg-background text-foreground">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
          <Link
            to="/admin"
            aria-label="Retour"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary active:scale-95"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[19px] font-semibold leading-tight tracking-tight">
              <T en="Audit log">Journal d'audit</T>
            </h1>
            <p className="truncate text-[12px] text-muted-foreground">
              <T en="Immutable history of every admin action">
                Historique immuable de toutes les actions administratives
              </T>
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
            <ScrollText className="h-[13px] w-[13px]" />
            <T en="Append-only">Append-only</T>
          </span>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8">
        <AuditLogPanel />
      </div>
    </div>
  );
};

export default AuditLogPage;
