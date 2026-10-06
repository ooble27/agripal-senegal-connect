import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, LayoutGrid, ChevronRight, MessageSquare, Building2, Globe, MapPin, Phone, Hash, Mail, User, Lock, SunMoon } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "@/components/app/AppShell";
import CopyRow from "@/components/app/CopyRow";
import { LangPill } from "@/components/app/LangToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getMyProfile, type MyProfile } from "@/lib/profile";
import { getMyKyc, type KycDbStatus } from "@/lib/kyc";
import { useLang, useT } from "@/lib/i18n";
import { getTheme, onThemeChange, setTheme, type Theme } from "@/lib/theme";
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
      wider
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

/* ─── Tablette / ordinateur : profil à gauche, réglages à droite ───
   Arrondis sobres (même rayon que les boutons), textes à taille normale,
   chaque bloc de droite occupe toute la largeur et répartit ses infos en
   colonnes. */

const initialsOf = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

const Panel = ({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-xl border border-border bg-card", className)}>
    {title && (
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
    )}
    {children}
  </section>
);

const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("min-w-0 px-6 py-4", className)}>
    <p className="text-[12.5px] text-muted-foreground">{label}</p>
    <div className="mt-1 text-[15.5px]">{children}</div>
  </div>
);

/** Choix à deux options, libellés en clair (langue, apparence). */
const Choice = <V extends string>({ value, options, onChange }: { value: V; options: { v: V; label: string }[]; onChange: (v: V) => void }) => (
  <div className="inline-flex rounded-xl border border-border bg-secondary/60 p-1">
    {options.map((o) => (
      <button
        key={o.v}
        type="button"
        onClick={() => onChange(o.v)}
        aria-pressed={value === o.v}
        className={cn(
          "rounded-lg px-4 py-1.5 text-[14px] font-medium transition-colors",
          value === o.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const SmallButton = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Button asChild variant="appOutline" shape="rounded" className="h-auto px-3.5 py-1.5 text-[13.5px]">
    <Link to={to}>{children}</Link>
  </Button>
);

function DesktopAccount({
  profile, kyc, name, email, isStaff, onLogout,
}: {
  profile: MyProfile | null; kyc: KycDbStatus | null; name: string; email: string; isStaff: boolean; onLogout: () => void;
}) {
  const t = useT();
  const [lang, setLang] = useLang();
  const [theme, setThemeState] = useState<Theme>(getTheme);
  useEffect(() => onThemeChange(setThemeState), []);
  const business = profile?.accountType === "business";
  const pill = (st: KycDbStatus) => (
    <span className={cn("shrink-0 rounded-lg px-2.5 py-1 text-[12.5px] font-semibold", KYC_TONE[st])}>{t(KYC_KEYS[st])}</span>
  );
  const verifRow = (to: string, Icon: React.ElementType, label: string, st: KycDbStatus) => (
    <Link to={to} className="flex items-center gap-3.5 border-t border-border px-6 py-4 transition-colors hover:bg-secondary/40">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
      <span className="flex-1 text-[15px]">{label}</span>
      {pill(st)}
      <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
    </Link>
  );

  return (
    <div className="hidden items-start gap-6 md:flex lg:gap-8">
      {/* Colonne profil */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-5 lg:w-[340px]">
        <Panel className="flex flex-col items-center px-6 py-8 text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-xl bg-secondary font-display text-[30px] font-medium tracking-tight text-foreground/85">
            {initialsOf(name || email)}
          </span>
          <p className="mt-5 max-w-full truncate font-display text-[22px] font-semibold tracking-tight">{name}</p>
          <p className="mt-1 max-w-full truncate text-[15px] text-muted-foreground">{email}</p>
          <span className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-[13px] font-medium text-foreground/80">
            {business ? (
              <BusinessMark name={profile?.businessName} size="sm" className="h-5 w-5 rounded-md text-[8.5px]" />
            ) : (
              <User className="h-4 w-4" strokeWidth={1.9} />
            )}
            <span className="truncate">{business ? t("kyb.accountBusiness") : t("acct.personal")}</span>
          </span>
        </Panel>

        <Panel>
          <p className="px-6 pb-3 pt-5 text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{t("acct.verifications")}</p>
          {kyc && verifRow("/app/verification", ShieldCheck, t("acct.identity"), kyc)}
          {business && profile && verifRow("/app/entreprise", Building2, t("acct.business"), profile.businessStatus)}
        </Panel>

        <div className="flex flex-wrap gap-2.5">
          {isStaff && (
            <Button asChild variant="appOutline" shape="rounded" className="h-auto gap-2 px-[18px] py-[10px] text-sm">
              <Link to="/admin"><LayoutGrid className="h-4 w-4" /> {t("acct.backoffice")}</Link>
            </Button>
          )}
          <Button variant="appOutline" shape="rounded" className="h-auto gap-2 px-[18px] py-[10px] text-sm" onClick={onLogout}>
            <LogOut className="h-4 w-4" /> {t("acct.logout")}
          </Button>
        </div>
      </aside>

      {/* Réglages : blocs pleine largeur */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {business && profile && (
          <Panel
            title={t("acct.business")}
            action={<SmallButton to="/app/entreprise">{t("acct.viewFile")}</SmallButton>}
          >
            <div className="flex items-center gap-4 px-6 pt-5">
              <BusinessMark name={profile.businessName} size="md" className="h-12 w-12 rounded-xl text-[16px]" />
              <div className="min-w-0">
                <p className="truncate text-[18px] font-semibold tracking-tight">{profile.businessName}</p>
                <div className="mt-1">{pill(profile.businessStatus)}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3">
              <Field label="NEQ / BN"><span className="tabular-nums">{profile.businessNumber || "—"}</span></Field>
              <Field label={t("regb.phone")}><span className="tabular-nums">{profile.businessPhone || "—"}</span></Field>
              <Field label={t("regb.address")}>{profile.businessAddress || "—"}</Field>
            </div>
          </Panel>
        )}

        {profile?.interacQuestion && (
          <Panel title={t("acct.interac")}>
            <p className="px-6 pt-4 text-[14px] leading-relaxed text-muted-foreground">{t("acct.interacSub")}</p>
            <div className="grid grid-cols-1 gap-3 p-6 pt-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-border"><CopyRow label={t("acct.question")} value={profile.interacQuestion} /></div>
              <div className="overflow-hidden rounded-xl border border-border"><CopyRow label={t("acct.answer")} value={profile.interacAnswer!} mono /></div>
            </div>
          </Panel>
        )}

        <Panel title={t("acct.security")}>
          <div className="grid grid-cols-1 xl:grid-cols-2">
            <div className="flex items-center gap-4 px-6 py-5">
              <Mail className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">{t("acct.email")}</p>
                <p className="truncate text-[13.5px] text-muted-foreground">{email}</p>
              </div>
              <SmallButton to="/app/changer-email">{t("acct.modify")}</SmallButton>
            </div>
            <div className="flex items-center gap-4 border-t border-border px-6 py-5 xl:border-l xl:border-t-0">
              <Lock className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">{t("acct.password")}</p>
                <p className="text-[13.5px] tracking-[0.2em] text-muted-foreground">••••••••</p>
              </div>
              <SmallButton to="/reinitialiser">{t("acct.modify")}</SmallButton>
            </div>
          </div>
        </Panel>

        <Panel title={t("acct.preferences")}>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
              <span className="flex items-center gap-3 text-[15px]"><Globe className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />{t("acct.language")}</span>
              <Choice value={lang} options={[{ v: "fr", label: "Français" }, { v: "en", label: "English" }]} onChange={setLang} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-5 lg:border-l lg:border-t-0">
              <span className="flex items-center gap-3 text-[15px]"><SunMoon className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />{t("acct.appearance")}</span>
              <Choice
                value={theme}
                options={[{ v: "light", label: t("acct.light") }, { v: "dark", label: t("acct.dark") }]}
                onChange={(v) => { setTheme(v); setThemeState(v); }}
              />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default Compte;
