import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, LayoutGrid, ChevronRight, MessageSquare, Building2, Globe, MapPin, Phone, Hash, Mail, User, Lock, SunMoon } from "lucide-react";
import ThemeToggle from "@/components/app/ThemeToggle";
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
import BusinessMark from "@/components/app/BusinessMark";
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

  return (
    <AppShell
      wide
      header={
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("acct.title")}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">{t("acct.sub")}</p>
        </div>
      }
    >
      {/* Tablette et ordinateur : deux colonnes (proposition A). */}
      <DesktopAccount profile={profile} kyc={kyc} name={user?.name ?? ""} email={user?.email ?? ""} isStaff={isStaff} onLogout={logout} />

      {/* Téléphone : mise en page d'origine, inchangée. */}
      <div className="md:hidden">
      {/* ─── Profile card ─── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-4 p-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground shadow-sm">
            <User className="h-7 w-7" strokeWidth={1.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-bold tracking-tight">{user?.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            {profile?.accountType === "business" && (
              <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-secondary py-[3px] pl-[3px] pr-2.5 text-[11.5px] font-semibold text-foreground/75">
                <BusinessMark name={profile.businessName} size="sm" className="h-[18px] w-[18px] rounded-full text-[8px]" />
                <span className="truncate">{t("kyb.accountBusiness")}</span>
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

      {/* ─── Email ─── */}
      <Link to="/app/changer-email" className="mt-3 flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:bg-secondary/40">
        <Mail className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium">{t("acct.email")}</span>
          <p className="truncate text-[13px] text-muted-foreground">{user?.email}</p>
        </div>
        <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
      </Link>

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

        {/* Vérification de l'entreprise (comptes entreprise) */}
        {profile?.accountType === "business" && (
          <Link to="/app/entreprise" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
            <Building2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
            <span className="flex-1 text-sm font-medium">{t("acct.businessVerif")}</span>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", KYC_TONE[profile.businessStatus])}>
              {t(KYC_KEYS[profile.businessStatus])}
            </span>
            <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
          </Link>
        )}

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
      </div>
    </AppShell>
  );
};

/* ─── Tablette / ordinateur : profil à gauche, réglages en grille à droite ─── */

const initialsOf = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <section className={cn("overflow-hidden rounded-[22px] border border-border bg-card", className)}>{children}</section>
);
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="px-5 pb-3 pt-5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{children}</p>
);
const LinkRow = ({ to, icon: Icon, label, sub, right }: { to: string; icon: React.ElementType; label: string; sub?: string; right?: React.ReactNode }) => (
  <Link to={to} className="flex items-center gap-3 border-t border-border px-5 py-3.5 transition-colors hover:bg-secondary/40">
    <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.7} />
    <span className="min-w-0 flex-1">
      <span className="block text-[14.5px]">{label}</span>
      {sub && <span className="block truncate text-[12.5px] text-muted-foreground">{sub}</span>}
    </span>
    {right}
  </Link>
);

function DesktopAccount({
  profile, kyc, name, email, isStaff, onLogout,
}: {
  profile: MyProfile | null; kyc: KycDbStatus | null; name: string; email: string; isStaff: boolean; onLogout: () => void;
}) {
  const t = useT();
  const business = profile?.accountType === "business";
  const pill = (st: KycDbStatus) => (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", KYC_TONE[st])}>{t(KYC_KEYS[st])}</span>
  );
  return (
    <div className="hidden items-start gap-6 md:flex">
      {/* Colonne profil */}
      <aside className="flex w-[280px] shrink-0 flex-col gap-4 lg:w-[300px]">
        <Card className="flex flex-col items-center px-6 py-7 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-secondary font-display text-[26px] font-medium tracking-tight text-foreground/85">
            {initialsOf(name || email)}
          </span>
          <p className="mt-4 max-w-full truncate font-display text-[19px] font-semibold tracking-tight">{name}</p>
          <p className="mt-1 max-w-full truncate text-sm text-muted-foreground">{email}</p>
          <span className="mt-3.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-secondary py-[3px] pl-[3px] pr-2.5 text-[11.5px] font-semibold text-foreground/75">
            {business ? (
              <BusinessMark name={profile?.businessName} size="sm" className="h-[18px] w-[18px] rounded-full text-[8px]" />
            ) : (
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-foreground text-background"><User className="h-2.5 w-2.5" strokeWidth={2.4} /></span>
            )}
            <span className="truncate">{business ? t("kyb.accountBusiness") : t("acct.personal")}</span>
          </span>
        </Card>

        <Card>
          <Eyebrow>{t("acct.verifications")}</Eyebrow>
          <LinkRow to="/app/verification" icon={ShieldCheck} label={t("acct.identity")} right={kyc && pill(kyc)} />
          {business && profile && (
            <LinkRow to="/app/entreprise" icon={Building2} label={t("acct.business")} right={pill(profile.businessStatus)} />
          )}
        </Card>

        {isStaff && (
          <Card>
            <LinkRow to="/admin" icon={LayoutGrid} label={t("acct.backoffice")} right={<ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />} />
          </Card>
        )}

        <Button variant="appOutline" shape="rounded" className="h-auto gap-2 self-start px-[18px] py-[10px] text-sm" onClick={onLogout}>
          <LogOut className="h-4 w-4" /> {t("acct.logout")}
        </Button>
      </aside>

      {/* Réglages */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {business && profile && (
          <Card>
            <div className="flex items-center gap-3 px-5 pb-4 pt-5">
              <BusinessMark name={profile.businessName} size="md" className="h-10 w-10 rounded-xl text-[14px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15.5px] font-medium">{profile.businessName}</p>
                <p className="text-[12.5px] text-muted-foreground">{t(KYC_KEYS[profile.businessStatus])}</p>
              </div>
              <Link to="/app/entreprise" className="shrink-0 text-[13px] text-foreground/80 hover:text-foreground hover:underline">
                {t("acct.viewFile")}
              </Link>
            </div>
            {profile.businessNumber && (
              <div className="flex justify-between gap-4 border-t border-border px-5 py-3 text-sm">
                <span className="text-muted-foreground">NEQ / BN</span><span className="tabular-nums">{profile.businessNumber}</span>
              </div>
            )}
            {profile.businessAddress && (
              <div className="flex justify-between gap-4 border-t border-border px-5 py-3 text-sm">
                <span className="shrink-0 text-muted-foreground">{t("regb.address")}</span><span className="text-right">{profile.businessAddress}</span>
              </div>
            )}
            {profile.businessPhone && (
              <div className="flex justify-between gap-4 border-t border-border px-5 py-3 text-sm">
                <span className="text-muted-foreground">{t("regb.phone")}</span><span className="tabular-nums">{profile.businessPhone}</span>
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {profile?.interacQuestion && (
          <Card>
            <div className="px-5 pb-3 pt-5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t("acct.interac")}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t("acct.interacSub")}</p>
            </div>
            <div className="divide-y divide-border border-t border-border">
              <CopyRow label={t("acct.question")} value={profile.interacQuestion} />
              <CopyRow label={t("acct.answer")} value={profile.interacAnswer!} mono />
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-5">
        <Card>
          <Eyebrow>{t("acct.security")}</Eyebrow>
          <LinkRow to="/app/changer-email" icon={Mail} label={t("acct.email")} sub={email} right={<span className="text-[13px] text-foreground/80">{t("acct.modify")}</span>} />
          <LinkRow to="/reinitialiser" icon={Lock} label={t("acct.password")} right={<span className="text-[13px] text-foreground/80">{t("acct.modify")}</span>} />
        </Card>

        <Card>
          <Eyebrow>{t("acct.preferences")}</Eyebrow>
          <div className="flex items-center gap-3 border-t border-border px-5 py-3">
            <Globe className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.7} />
            <span className="flex-1 text-[14.5px]">{t("acct.language")}</span>
            <LangPill />
          </div>
          <div className="flex items-center gap-3 border-t border-border px-5 py-3">
            <SunMoon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.7} />
            <span className="flex-1 text-[14.5px]">{t("acct.appearance")}</span>
            <ThemeToggle />
          </div>
        </Card>
        </div>
        </div>
      </div>
    </div>
  );
}

export default Compte;
