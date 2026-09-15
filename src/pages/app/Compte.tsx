import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, LayoutGrid, ChevronRight, MessageSquare, Building2, Globe, MapPin, Phone, Hash } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "@/components/app/AppShell";
import CopyRow from "@/components/app/CopyRow";
import { LangPill } from "@/components/app/LangToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getMyProfile, type MyProfile } from "@/lib/profile";
import { getMyKyc, type KycDbStatus } from "@/lib/kyc";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/translations";

const KYC_KEYS: Record<KycDbStatus, TKey> = {
  not_started: "kyc.notStarted",
  pending: "kyc.pending",
  approved: "kyc.approved",
  rejected: "kyc.rejected",
};

const KYC_TONE: Record<KycDbStatus, string> = {
  not_started: "bg-secondary text-muted-foreground",
  pending: "bg-secondary text-foreground",
  approved: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

const Compte = () => {
  const navigate = useNavigate();
  const { user, signOut, isStaff } = useAuth();
  const t = useT();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [kyc, setKyc] = useState<KycDbStatus | null>(null);

  useEffect(() => {
    getMyProfile().then(setProfile);
    getMyKyc().then((k) => setKyc(k?.status ?? "not_started"));
  }, []);

  const logout = async () => {
    await signOut();
    navigate("/connexion", { replace: true });
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? "O";

  return (
    <AppShell
      header={
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("acct.title")}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">{t("acct.sub")}</p>
        </div>
      }
    >
      {/* ─── Profile card ─── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-4 p-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-deep font-display text-2xl font-bold text-white shadow-sm">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-bold tracking-tight">{user?.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            {profile?.accountType === "business" && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-deep/10 px-2.5 py-0.5 text-[11px] font-semibold text-deep">
                <Building2 className="h-3 w-3" /> {t("acct.business")}
              </span>
            )}
          </div>
        </div>

        {/* Business details (inline under profile) */}
        {profile?.accountType === "business" && profile.businessName && (
          <div className="divide-y divide-border border-t border-border">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
              <span className="flex-1 text-sm text-muted-foreground">{t("acct.businessName")}</span>
              <span className="text-sm font-medium">{profile.businessName}</span>
            </div>
            {profile.businessNumber && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Hash className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
                <span className="flex-1 text-sm text-muted-foreground">NEQ / BN</span>
                <span className="font-mono text-sm">{profile.businessNumber}</span>
              </div>
            )}
            {profile.businessAddress && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
                <span className="flex-1 text-sm text-muted-foreground">{t("regb.address")}</span>
                <span className="text-right text-sm">{profile.businessAddress}</span>
              </div>
            )}
            {profile.businessPhone && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
                <span className="flex-1 text-sm text-muted-foreground">{t("regb.phone")}</span>
                <span className="text-sm">{profile.businessPhone}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Interac e-Transfer ─── */}
      {profile?.interacQuestion && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2.5 px-5 pb-1 pt-4">
            <MessageSquare className="h-4 w-4 text-muted-foreground" strokeWidth={1.9} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("acct.interac")}</p>
          </div>
          <p className="px-5 pb-2 text-[12.5px] text-muted-foreground">
            {t("acct.interacSub")}
          </p>
          <div className="divide-y divide-border border-t border-border">
            <CopyRow label={t("acct.question")} value={profile.interacQuestion} />
            <CopyRow label={t("acct.answer")} value={profile.interacAnswer!} mono />
          </div>
        </div>
      )}

      {/* ─── Settings group ─── */}
      <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {/* Language */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Globe className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
          <span className="flex-1 text-sm font-medium">{t("acct.language")}</span>
          <LangPill />
        </div>

        {/* KYC */}
        <Link to="/app/verification" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
          <span className="flex-1 text-sm font-medium">{t("acct.kyc")}</span>
          {kyc && (
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", KYC_TONE[kyc])}>
              {t(KYC_KEYS[kyc])}
            </span>
          )}
          <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
        </Link>

        {/* Back-office (staff only) */}
        {isStaff && (
          <Link to="/admin" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
            <span className="flex-1 text-sm font-medium">{t("acct.backoffice")}</span>
            <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
          </Link>
        )}
      </div>

      {/* ─── Logout ─── */}
      <div className="mt-5 flex justify-end">
        <Button variant="appOutline" shape="rounded" className="h-auto gap-2 px-[18px] py-[10px] text-sm" onClick={logout}>
          <LogOut className="h-4 w-4" /> {t("acct.logout")}
        </Button>
      </div>
    </AppShell>
  );
};

export default Compte;
