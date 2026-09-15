import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/app/ThemeToggle";
import { LangPill } from "@/components/app/LangToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

const InscriptionIndividuel = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function traduireErreur(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered")) return t("reg.errAlreadyExists");
    if (m.includes("password should be at least")) return t("reg.errPasswordShort");
    if (m.includes("unable to validate email")) return t("reg.errBadEmail");
    return message;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signUp(email, password, name, { accountType: "individual" });
      if (res.error) return setError(traduireErreur(res.error));
      if (res.needsConfirmation) {
        setNotice(t("regi.notice"));
        return;
      }
      navigate("/app", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ink-neutral app-type flex min-h-screen flex-col bg-background tracking-[-0.015em]">
      <header className="flex items-center justify-between px-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <LangPill />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[440px]">
          <Link
            to="/inscription"
            className="mb-6 inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("regi.back")}
          </Link>

          <h1 className="font-display text-[2rem] leading-[1.05] tracking-[-0.04em] sm:text-[2.4rem]">
            {t("regi.title")}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t("regi.sub")}
          </p>

          {notice ? (
            <div className="mt-8 overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04]">
              <div className="px-5 py-5 text-[14px] leading-relaxed text-foreground">
                {notice}
                <div className="mt-4">
                  <Link
                    to="/connexion"
                    className="inline-flex items-center gap-2 text-[13px] text-primary hover:underline"
                  >
                    {t("regi.goLogin")} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <Field
                  label={t("regi.fullName")}
                  icon={User}
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Field
                  label={t("login.email")}
                  icon={Mail}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Field
                  label={t("login.password")}
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
              </div>

              {error && (
                <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                  {error}
                </p>
              )}

              <div className="mt-5 flex justify-end">
                <Button type="submit" variant="appSolid" shape="rounded" size="default" className="px-6" disabled={busy}>
                  {busy ? t("misc.wait") : t("regi.createAccount")}
                  {!busy && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          )}

          <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
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

export default InscriptionIndividuel;
