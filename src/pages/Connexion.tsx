import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/app/ThemeToggle";
import { LangPill } from "@/components/app/LangToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Mode = "login" | "forgot";

const Field = ({
  label,
  icon: Icon,
  trailing,
  last,
  ...props
}: {
  label: string;
  icon: React.ElementType;
  trailing?: React.ReactNode;
  last?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div
    className={cn(
      "px-4 py-3 transition-colors focus-within:bg-primary/[0.03]",
      !last && "border-b border-border/50",
    )}
  >
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" strokeWidth={1.6} />
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/60">
        {label}
      </span>
    </div>
    <div className="mt-1 flex items-center gap-2">
      <input
        className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/30"
        {...props}
      />
      {trailing}
    </div>
  </div>
);

const Connexion = () => {
  const navigate = useNavigate();
  const { signIn, sendPasswordReset } = useAuth();
  const t = useT();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isForgot = mode === "forgot";

  const traduireErreur = (message: string): string => {
    const m = message.toLowerCase();
    if (m.includes("invalid login")) return t("login.errInvalid");
    if (m.includes("email not confirmed")) return t("login.errNotConfirmed");
    if (m.includes("unable to validate email")) return t("login.errBadEmail");
    return message;
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
    setShowPassword(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (isForgot) {
        const res = await sendPasswordReset(email);
        if (res.error) return setError(traduireErreur(res.error));
        setNotice(t("login.resetSent"));
        return;
      }
      const res = await signIn(email, password);
      if (res.error) return setError(traduireErreur(res.error));
      navigate("/app", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const title = isForgot ? t("login.forgotTitle") : t("login.title");
  const subtitle = isForgot ? t("login.forgotSub") : t("login.sub");

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
          {isForgot && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="mb-6 inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t("login.backToLogin")}
            </button>
          )}

          <h1 className="font-display text-[2rem] leading-[1.05] tracking-[-0.04em] sm:text-[2.4rem]">
            {title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>

          <form onSubmit={submit} className="mt-8">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <Field
                label={t("login.email")}
                icon={Mail}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                last={isForgot}
              />

              {!isForgot && (
                <Field
                  label={t("login.password")}
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  last
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t("misc.hidePw") : t("misc.showPw")}
                      className="shrink-0 text-muted-foreground/50 transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.6} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.6} />}
                    </button>
                  }
                />
              )}
            </div>

            {mode === "login" && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("login.forgot")}
                </button>
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 text-[14px] leading-relaxed text-foreground">
                {notice}
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <Button type="submit" variant="appSolid" shape="rounded" size="default" className="px-6" disabled={busy}>
                {busy ? t("misc.wait") : isForgot ? t("login.sendLink") : t("login.submit")}
                {!busy && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </form>

          {!isForgot && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("login.newUser")}{" "}
              <Link
                to="/inscription"
                className="text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
              >
                {t("login.createAccount")}
              </Link>
            </p>
          )}

          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
            {t("login.ncNote")}{" "}
            <Link to="/" className="underline hover:text-foreground">
              {t("login.backHome")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Connexion;
