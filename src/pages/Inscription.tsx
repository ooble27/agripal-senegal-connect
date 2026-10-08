import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import HelpShape from "@/components/help/HelpShape";
import { HELP_COLORS } from "@/lib/faq";
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
  const { user, signInWithGoogle } = useAuth();
  const t = useT();

  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  const choices = [
    { to: "/inscription/individuel", title: t("reg.individual"), sub: t("reg.individualSub"), shape: "circle" as const, color: HELP_COLORS.coral },
    { to: "/inscription/entreprise", title: t("reg.business"), sub: t("reg.businessSub"), shape: "square" as const, color: HELP_COLORS.forest },
  ];

  return (
    <AuthShell variant="signup">
      <h1 className="font-display text-[2.4rem] font-semibold leading-[1] tracking-[-0.05em] sm:text-[2.9rem]">
        {t("reg.title")}
        <span style={{ color: HELP_COLORS.coral }}>.</span>
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t("reg.sub")}</p>

      <div className="mt-10">
        {choices.map((c) => (
          <button
            key={c.to}
            type="button"
            onClick={() => navigate(c.to)}
            className="group flex w-full items-center gap-5 border-t py-6 text-left last:border-b"
          >
            <HelpShape shape={c.shape} color={c.color} className="h-8 w-8 shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[1.5rem] font-semibold leading-[1.1] tracking-[-0.04em]">{c.title}</span>
              <span className="mt-1 block text-[13.5px] leading-[1.5] text-muted-foreground">{c.sub}</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-foreground/30 transition-all group-hover:translate-x-1 group-hover:text-foreground" strokeWidth={1.8} />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-md border border-border bg-card px-5 py-3.5 text-sm font-medium transition-colors hover:bg-secondary/60"
      >
        <GoogleIcon />
        {t("login.google")}
      </button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("reg.hasAccount")}{" "}
        <Link to="/connexion" className="text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
          {t("reg.login")}
        </Link>
      </p>
    </AuthShell>
  );
};

export default Inscription;
