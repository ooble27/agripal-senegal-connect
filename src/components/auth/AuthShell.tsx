import Logo from "@/components/Logo";
import ThemeToggle from "@/components/app/ThemeToggle";
import { LangPill } from "@/components/app/LangToggle";
import { HELP_COLORS } from "@/lib/faq";
import { useLang } from "@/lib/i18n";

/* Cadre des pages de connexion et d'inscription : le formulaire à gauche, un
   panneau de couleur à droite (ordinateur seulement) avec une grande phrase,
   les formes de la marque et une carte d'ordre terminé — même langage que
   la page Entreprises et le centre d'aide. */

type Variant = "login" | "signup" | "business" | "reset";
type Bi = { fr: string; en: string };

const C = HELP_COLORS;
const INK = "#14110f";

const PANELS: Record<Variant, { bg: string; ink: string; a: Bi; b: Bi; accent: string }> = {
  login:    { bg: C.forest, ink: C.cream, a: { fr: "Bon retour.", en: "Welcome back." }, b: { fr: "Vos USDT vous attendent.", en: "Your USDT are waiting." }, accent: C.sun },
  signup:   { bg: C.sun, ink: INK, a: { fr: "Vos USDT,", en: "Your USDT," }, b: { fr: "en dollars canadiens.", en: "in Canadian dollars." }, accent: C.coral },
  business: { bg: C.peach, ink: INK, a: { fr: "Au nom de", en: "In your" }, b: { fr: "votre entreprise.", en: "company's name." }, accent: C.forest },
  reset:    { bg: C.mint, ink: INK, a: { fr: "Un nouveau", en: "A fresh" }, b: { fr: "mot de passe.", en: "password." }, accent: C.coral },
};

const AuthShell = ({ variant, children }: { variant: Variant; children: React.ReactNode }) => {
  const [lang] = useLang();
  const P = PANELS[variant];
  const en = lang === "en";

  return (
    <div className="ink-neutral app-type grid min-h-screen bg-background tracking-[-0.015em] lg:grid-cols-[1fr_minmax(0,0.95fr)]">
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10">
          <Logo />
          <div className="flex items-center gap-2.5">
            <LangPill />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="animate-up w-full max-w-[440px]">{children}</div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden lg:block" style={{ background: P.bg, color: P.ink }} aria-hidden>
        {/* formes de la marque */}
        <span className="ooble-float absolute right-[12%] top-[10%] h-24 w-24 rounded-full" style={{ background: P.accent }} />
        <span className="ooble-float absolute left-[10%] top-[38%] h-0 w-0 border-x-[34px] border-b-[58px] border-x-transparent [animation-delay:-2s]" style={{ borderBottomColor: variant === "signup" ? C.forest : C.sun }} />
        <span className="ooble-float absolute left-[34%] top-[11%] h-14 w-14 rotate-12 rounded-lg [animation-delay:-4s]" style={{ background: variant === "reset" ? C.forest : C.mint }} />
        <svg viewBox="0 0 120 60" className="ooble-float absolute bottom-[30%] left-[16%] w-28 [animation-delay:-1s]">
          <path d="M0 60a60 60 0 0 1 120 0z" fill={variant === "business" ? C.coral : C.peach} />
        </svg>

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <p className="text-[12px] uppercase tracking-[0.18em] opacity-70">Ooble · USDT ⇄ CAD</p>

          {/* carte d'ordre terminé */}
          <div className="mx-auto w-full max-w-[340px] rotate-[-3deg] rounded-lg bg-white p-5 text-[#14110f] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between text-[12px] text-[#6e6e73]">
              <span className="font-mono">OOB-7K2Q9C4M</span>
              <span className="rounded-[4px] bg-[#ecf8f1] px-2 py-0.5 font-medium text-[#157a43]">{en ? "Completed" : "Terminé"}</span>
            </div>
            <p className="mt-4 font-display text-[2rem] font-semibold leading-none tracking-[-0.05em]">+172,41 <span className="text-[1rem] text-[#6e6e73]">USDT</span></p>
            <div className="mt-4 space-y-1.5 border-t border-[#ececea] pt-3 text-[12.5px]">
              <p className="flex justify-between"><span className="text-[#6e6e73]">{en ? "Paid" : "Payé"}</span><span>250,00 $ · Interac</span></p>
              <p className="flex justify-between"><span className="text-[#6e6e73]">{en ? "Network" : "Réseau"}</span><span>Tron · TRC20</span></p>
              <p className="flex justify-between"><span className="text-[#6e6e73]">{en ? "Delivered in" : "Livré en"}</span><span>2 min</span></p>
            </div>
          </div>

          <h2 className="max-w-[520px] font-display text-[3.6rem] font-semibold leading-[0.98] tracking-[-0.055em] xl:text-[4.4rem]">
            {P.a[lang]}
            <br />
            <span style={{ opacity: 0.55 }}>{P.b[lang]}</span>
          </h2>
        </div>
      </aside>
    </div>
  );
};

export default AuthShell;
