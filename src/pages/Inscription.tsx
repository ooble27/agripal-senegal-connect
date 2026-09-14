import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/app/ThemeToggle";
import { LangPill } from "@/components/app/LangToggle";
import { useT } from "@/lib/i18n";

const Inscription = () => {
  const navigate = useNavigate();
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

          <p className="mt-8 text-center text-sm text-muted-foreground">
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
