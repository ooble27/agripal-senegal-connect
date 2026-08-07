import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, KeyRound, Sun, Moon, LayoutGrid, ChevronRight, MessageSquare, Building2, Bell, BellOff } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "@/components/app/AppShell";
import CopyRow from "@/components/app/CopyRow";
import { LangPicker } from "@/components/app/LangToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getMyProfile, type MyProfile } from "@/lib/profile";
import { getMyKyc, type KycDbStatus } from "@/lib/kyc";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/translations";
import { pushSupported, isSubscribed, subscribePush, unsubscribePush } from "@/lib/pushNotifications";

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
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [kyc, setKyc] = useState<KycDbStatus | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const hasPush = pushSupported();

  useEffect(() => {
    getMyProfile().then(setProfile);
    getMyKyc().then((k) => setKyc(k?.status ?? "not_started"));
    if (hasPush) isSubscribed().then(setPushOn);
  }, []);

  const chooseTheme = (th: Theme) => {
    setTheme(th);
    setThemeState(th);
  };

  const logout = async () => {
    await signOut();
    navigate("/connexion", { replace: true });
  };

  return (
    <AppShell
      header={
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("acct.title")}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">{t("acct.sub")}</p>
        </div>
      }
    >
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-deep font-display text-xl font-bold text-white">
          {user?.name?.charAt(0).toUpperCase() ?? "O"}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">{user?.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          {profile?.accountType === "business" && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-deep/10 px-2 py-0.5 text-[11px] font-semibold text-deep">
              <Building2 className="h-3 w-3" /> {t("acct.business")}
            </span>
          )}
        </div>
      </div>

      {profile?.accountType === "business" && profile.businessName && (
        <div className="mt-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2.5 px-5 pb-1 pt-4">
            <Building2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.9} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("acct.business")}</p>
          </div>
          <div className="divide-y divide-border border-t border-border">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-muted-foreground">{t("acct.businessName")}</span>
              <span className="text-sm font-medium">{profile.businessName}</span>
            </div>
            {profile.businessNumber && (
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-muted-foreground">NEQ / BN</span>
                <span className="font-mono text-sm">{profile.businessNumber}</span>
              </div>
            )}
            {profile.businessAddress && (
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-muted-foreground">{t("regb.address")}</span>
                <span className="text-right text-sm">{profile.businessAddress}</span>
              </div>
            )}
            {profile.businessPhone && (
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-muted-foreground">{t("regb.phone")}</span>
                <span className="text-sm">{profile.businessPhone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {profile?.interacQuestion && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
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

      {/* Appearance */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <span className="flex-1 text-sm font-medium">{t("acct.appearance")}</span>
        <div className="flex rounded-lg border border-border bg-secondary/60 p-0.5">
          {([
            { key: "light" as Theme, icon: Sun, labelKey: "acct.light" as TKey },
            { key: "dark" as Theme, icon: Moon, labelKey: "acct.dark" as TKey },
          ]).map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseTheme(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                theme === key ? "bg-card text-foreground dark:bg-neutral-600" : "text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <span className="flex-1 text-sm font-medium">{t("acct.language")}</span>
        <LangPicker />
      </div>

      {/* Notifications push */}
      {hasPush && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          {pushOn
            ? <Bell className="h-5 w-5 text-primary" strokeWidth={1.9} />
            : <BellOff className="h-5 w-5 text-muted-foreground" strokeWidth={1.9} />}
          <div className="flex-1">
            <span className="text-sm font-medium">{t("acct.notifications")}</span>
            <p className="text-[11.5px] text-muted-foreground">{t("acct.notifSub")}</p>
          </div>
          <button
            type="button"
            disabled={pushLoading}
            onClick={async () => {
              setPushLoading(true);
              if (pushOn) {
                await unsubscribePush();
                setPushOn(false);
              } else {
                const ok = await subscribePush();
                setPushOn(ok);
              }
              setPushLoading(false);
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              pushOn ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            {pushLoading ? "…" : pushOn ? t("acct.notifOff") : t("acct.notifOn")}
          </button>
        </div>
      )}

      <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        <Link to="/app/verification" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" strokeWidth={1.9} />
          <span className="flex-1 text-sm font-medium">{t("acct.kyc")}</span>
          {kyc && (
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", KYC_TONE[kyc])}>
              {t(KYC_KEYS[kyc])}
            </span>
          )}
          <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-3 px-5 py-4">
          <KeyRound className="h-5 w-5 text-muted-foreground" strokeWidth={1.9} />
          <span className="flex-1 text-sm font-medium">{t("acct.nonCustodial")}</span>
        </div>
        {isStaff && (
          <Link to="/admin" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" strokeWidth={1.9} />
            <span className="flex-1 text-sm font-medium">{t("acct.backoffice")}</span>
            <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
          </Link>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="appOutline" shape="rounded" className="h-auto gap-2 px-[18px] py-[10px] text-sm" onClick={logout}>
          <LogOut className="h-4 w-4" /> {t("acct.logout")}
        </Button>
      </div>
    </AppShell>
  );
};

export default Compte;
