import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import Logo from "@/components/Logo";
import { useT } from "@/lib/i18n";

/** Après la suppression du compte. */
const AuRevoir = () => {
  const t = useT();
  return (
    <div className="app-surface app-type flex min-h-screen flex-col bg-background px-6">
      <header className="pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center">
        <div className="animate-up w-full max-w-[420px] text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background">
            <Check className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <h1 className="mt-6 font-display text-[26px] font-semibold tracking-tight">{t("del.doneTitle")}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{t("del.doneSub")}</p>
          <Link to="/" className="mt-8 inline-flex h-10 items-center rounded-xl border border-border px-5 text-[14px] font-medium transition-colors hover:bg-secondary">
            {t("del.home")}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AuRevoir;
