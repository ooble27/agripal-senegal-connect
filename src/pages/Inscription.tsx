import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/app/ThemeToggle";
import { LangPill } from "@/components/app/LangToggle";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const Inscription = () => {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const t = useT();

  return (
    <div className="ink-neutral app-type flex min-h-screen flex-col bg-background tracking-[-0.015em]">
      <header className="flex items-center justify-between px-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10">
        <Logo />
        <div className="flex items-center gap-2.5">
          <LangPill />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[440px]">
          <h1 className="font-display text-[2.1rem] leading-[1.05] tracking-[-0.04em] sm:text-[2.5rem]">
            {t("reg.title")}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t("reg.sub")}
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => navigate("/inscription/individuel")}
              className="group flex w-full items-center gap-5 rounded-2xl border border-border bg-card px-6 py-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="min-w-0 flex-1">
                <span className="block font-display text-[16px] tracking-[-0.02em]">
                  {t("reg.individual")}
                </span>
                <span className="mt-1 block text-[13px] leading-[1.5] text-muted-foreground">
                  {t("reg.individualSub")}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>

            <button
              type="button"
              onClick={() => navigate("/inscription/entreprise")}
              className="group flex w-full items-center gap-5 rounded-2xl border border-border bg-card px-6 py-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="min-w-0 flex-1">
                <span className="block font-display text-[16px] tracking-[-0.02em]">
                  {t("reg.business")}
                </span>
                <span className="mt-1 block text-[13px] leading-[1.5] text-muted-foreground">
                  {t("reg.businessSub")}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("login.or")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-medium transition-colors hover:bg-secondary/60 active:scale-[0.98]"
          >
            <GoogleIcon />
            {t("login.google")}
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("reg.hasAccount")}{" "}
            <Link
              to="/connexion"
              className="text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
            >
              {t("reg.login")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Inscription;
