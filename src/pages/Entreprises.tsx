import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Check, Handshake } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import OtcVideo from "@/components/OtcVideo";
import { Button } from "@/components/ui/button";
import { TRADE_DAILY_MAX_CAD } from "@/lib/config";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* Ooble pour les entreprises — page publique à part entière, dans la palette
   chaude de sa vidéo (vert forêt, menthe, corail, tournesol). Pas de gabarit
   commun : en-tête vert plein écran avec la vidéo qui déborde, sélecteur
   d'usages, étapes racontées au défilement, liste « Votre dossier est-il
   prêt ? » à cocher, simulateur de montant (app ou desk OTC), bandeau des
   métiers et appel final. Les durées reprennent celles affichées dans l'app
   (vérification en environ 5 minutes, examen généralement sous 1 jour
   ouvrable). */

type Bi = { fr: string; en: string };

const FOREST = "#0f5c45", MINT = "#bfe8d6", CORAL = "#ff7a59", SUN = "#ffc94d", CREAM = "#f6f1e7";

const Wrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto max-w-[1200px] px-6 sm:px-10 ${className}`}>{children}</div>
);

/* ───────── Illustrations des usages (formes pleines) ───────── */
const ArtPay = () => (
  <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
    <rect x="0" y="230" width="400" height="70" fill={FOREST} opacity=".25" />
    {[0, 1, 2].map((r) => [0, 1, 2, 3].slice(0, 4 - r).map((k) => (
      <rect key={`${r}${k}`} x={95 + k * 52 + r * 26} y={150 - r * 34} width="46" height="30" rx="5" fill={[CORAL, SUN, CREAM, FOREST][(k + r) % 4]} />
    )))}
    <path d="M70 186 H330 L300 236 H100 Z" fill={CREAM} />
    <rect x="270" y="110" width="30" height="76" rx="6" fill={CREAM} />
    <circle cx="340" cy="60" r="26" fill={SUN} />
  </svg>
);
const ArtGetPaid = () => (
  <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
    <rect x="150" y="140" width="190" height="120" rx="22" fill={FOREST} />
    <rect x="290" y="180" width="62" height="44" rx="12" fill={CORAL} />
    <circle cx="315" cy="202" r="8" fill={CREAM} />
    {[[90, 70], [130, 40], [175, 82], [225, 55]].map(([x, y], i) => (
      <g key={i} transform={`translate(${x} ${y})`}>
        <circle r="26" fill="#26a17b" />
        <text y="10" textAnchor="middle" fontSize="28" fontWeight="700" fill="#fff">₮</text>
      </g>
    ))}
  </svg>
);
const ArtManage = () => (
  <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
    <rect x="120" y="60" width="160" height="200" rx="14" fill={CREAM} transform="rotate(-8 200 160)" />
    <rect x="120" y="60" width="160" height="200" rx="14" fill={CREAM} transform="rotate(5 200 160)" />
    <rect x="120" y="60" width="160" height="200" rx="14" fill="#fffaf0" />
    <rect x="120" y="60" width="160" height="40" rx="14" fill={CORAL} />
    {[0, 1, 2, 3].map((k) => <rect key={k} x="145" y={122 + k * 30} width={[110, 80, 96, 60][k]} height="12" rx="6" fill="#e9dfcb" />)}
    <circle cx="282" cy="236" r="34" fill={FOREST} />
    <path d="M265 236 l12 12 l22 -24" fill="none" stroke={CREAM} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const USES: { w: Bi; t: Bi; d: Bi; art: () => JSX.Element; bg: string }[] = [
  {
    w: { fr: "Payer", en: "Pay" }, art: ArtPay, bg: MINT,
    t: { fr: "Réglez vos fournisseurs à l'étranger.", en: "Pay suppliers abroad." },
    d: { fr: "Achetez des USDT en dollars canadiens et envoyez-les sur le réseau de votre fournisseur.", en: "Buy USDT with Canadian dollars and send it on your supplier's network." },
  },
  {
    w: { fr: "Encaisser", en: "Get paid" }, art: ArtGetPaid, bg: SUN,
    t: { fr: "Vos clients vous paient en USDT ?", en: "Clients pay you in USDT?" },
    d: { fr: "Vendez-les et recevez des dollars canadiens par Interac, au nom de la société.", en: "Sell it and receive Canadian dollars by Interac, in the company's name." },
  },
  {
    w: { fr: "Gérer", en: "Manage" }, art: ArtManage, bg: "#ffd2c4",
    t: { fr: "Une trace claire de chaque opération.", en: "A clear record of every trade." },
    d: { fr: "Tout est au nom de l'entreprise, avec l'historique de vos achats et de vos ventes.", en: "Everything is in the company's name, with the history of your purchases and sales." },
  },
];

const STEPS: { t: Bi; d: Bi; c: string }[] = [
  { t: { fr: "Ouvrez le compte", en: "Open the account" }, d: { fr: "Raison sociale, numéro d'entreprise (NEQ ou BN) et personne responsable. Quelques minutes.", en: "Business name, business number (NEQ or BN) and contact person. A few minutes." }, c: CORAL },
  { t: { fr: "Vérifiez l'entreprise", en: "Verify the business" }, d: { fr: "Depuis votre espace, en environ 5 minutes : informations, administrateurs et propriétaires, documents.", en: "From your dashboard, in about 5 minutes: details, directors and owners, documents." }, c: SUN },
  { t: { fr: "On examine le dossier", en: "We review the file" }, d: { fr: "Notre équipe conformité vous répond par courriel, généralement sous 1 jour ouvrable.", en: "Our compliance team replies by email, usually within 1 business day." }, c: MINT },
  { t: { fr: "Achetez et vendez", en: "Buy and sell" }, d: { fr: "Payez par Interac, recevez vos USDT sur l'un des 6 réseaux. Ou l'inverse.", en: "Pay by Interac, receive your USDT on one of 6 networks. Or the other way round." }, c: FOREST },
];

const READY: { g: Bi; items: Bi[] }[] = [
  { g: { fr: "L'entreprise", en: "The business" }, items: [
    { fr: "Raison sociale", en: "Legal name" }, { fr: "NEQ ou BN", en: "NEQ or BN" }, { fr: "Adresse du siège", en: "Head office address" }, { fr: "Activité principale", en: "Main activity" },
  ] },
  { g: { fr: "Les personnes", en: "The people" }, items: [
    { fr: "Administrateurs", en: "Directors" }, { fr: "Propriétaires de 25 % ou plus", en: "Owners of 25% or more" },
  ] },
  { g: { fr: "Les documents", en: "The documents" }, items: [
    { fr: "Statuts de constitution", en: "Articles of incorporation" }, { fr: "Registre des administrateurs", en: "Register of directors" }, { fr: "Preuve d'adresse (< 3 mois)", en: "Proof of address (< 3 months)" },
  ] },
];

const TRADES: Bi[] = [
  { fr: "Import-export", en: "Import-export" }, { fr: "Commerce en ligne", en: "E-commerce" }, { fr: "Agences", en: "Agencies" },
  { fr: "Logistique", en: "Logistics" }, { fr: "Studios", en: "Studios" }, { fr: "Grossistes", en: "Wholesalers" },
  { fr: "Consultants", en: "Consultants" }, { fr: "Développeurs", en: "Developers" }, { fr: "Événementiel", en: "Events" },
];

const nf = (n: number, lang: string) => (lang === "en" ? n.toLocaleString("en-CA") : n.toLocaleString("fr-CA").replace(/ | /g, " "));

const Entreprises = () => {
  const [lang] = useLang();
  const L = (b: Bi) => b[lang];

  /* Sélecteur d'usages : tourne seul jusqu'au premier clic. */
  const [use, setUse] = useState(0);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (pinned) return;
    const id = window.setInterval(() => setUse((u) => (u + 1) % USES.length), 5000);
    return () => window.clearInterval(id);
  }, [pinned]);

  /* Étapes : le numéro suit l'étape visible. */
  const [step, setStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.i)); }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  /* « Votre dossier est-il prêt ? » — gardé dans ce navigateur. */
  const all = useMemo(() => READY.flatMap((g) => g.items.map((i) => i.fr)), []);
  const [done, setDone] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ooble.biz.ready") ?? "[]"); } catch { return []; }
  });
  const toggle = (k: string) => setDone((d) => {
    const n = d.includes(k) ? d.filter((x) => x !== k) : [...d, k];
    try { localStorage.setItem("ooble.biz.ready", JSON.stringify(n)); } catch { /* navigation privée */ }
    return n;
  });
  const pct = Math.round((done.filter((k) => all.includes(k)).length / all.length) * 100);

  /* Simulateur : app jusqu'à 9 999 $, desk OTC au-delà. */
  const STOPS = [1000, 2500, 5000, 9999, 15000, 25000, 50000, 100000, 250000, 500000];
  const [stop, setStop] = useState(3);
  const amount = STOPS[stop];
  const inApp = amount <= TRADE_DAILY_MAX_CAD;

  const Open = ({ className, light }: { className?: string; light?: boolean }) => (
    <Button
      asChild
      variant={light ? "secondary" : "appSolid"}
      shape="rounded"
      size="lg"
      className={cn("px-7", light && "bg-background text-foreground hover:bg-background/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90", className)}
    >
      <Link to="/inscription/entreprise">
        <Building2 className="h-4 w-4" strokeWidth={1.8} />
        {L({ fr: "Ouvrir un compte entreprise", en: "Open a business account" })}
      </Link>
    </Button>
  );

  const U = USES[use];

  return (
    <div className="app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main>
        {/* ===================== EN-TÊTE VERT ===================== */}
        <section data-dark className="relative overflow-hidden pb-48 sm:pb-64 lg:pb-80 bg-foreground text-background dark:bg-secondary dark:text-foreground">
          {/* formes qui flottent, comme dans la vidéo */}
          <span aria-hidden className="ooble-float absolute left-[6%] top-[18%] h-10 w-10 rounded-full" style={{ background: CORAL }} />
          <span aria-hidden className="ooble-float absolute right-[9%] top-[14%] h-0 w-0 border-x-[22px] border-b-[38px] border-x-transparent [animation-delay:-2s]" style={{ borderBottomColor: SUN }} />
          <span aria-hidden className="ooble-float absolute right-[16%] top-[52%] h-9 w-9 rotate-12 rounded-lg [animation-delay:-4s]" style={{ background: MINT }} />
          <span aria-hidden className="ooble-float absolute left-[12%] top-[60%] h-6 w-6 rounded-full [animation-delay:-1s]" style={{ background: SUN }} />

          <Wrap className="relative pt-20 text-center lg:pt-24">
            <p className="animate-up text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: SUN }}>
              {L({ fr: "Ooble pour les entreprises", en: "Ooble for business" })}
            </p>
            <h1 className="animate-up mx-auto mt-6 max-w-[1050px] font-display text-[2.9rem] font-semibold leading-[0.98] tracking-[-0.05em] [animation-delay:80ms] sm:text-[4.4rem] lg:text-[5.6rem]">
              {L({ fr: "Vos USDT, au nom de votre ", en: "Your USDT, in your " })}
              <span style={{ color: SUN }}>{L({ fr: "entreprise.", en: "company's name." })}</span>
            </h1>
            <p className="animate-up mx-auto mt-7 max-w-[560px] text-[16px] leading-[1.7] opacity-75 [animation-delay:160ms]">
              {L({
                fr: "Achetez et vendez des USDT en dollars canadiens, payez vos fournisseurs et encaissez vos clients. La vérification se fait une seule fois.",
                en: "Buy and sell USDT with Canadian dollars, pay suppliers and get paid by clients. Verification is done once.",
              })}
            </p>
            <div className="animate-up mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 [animation-delay:240ms]">
              <Open light />
              <a href="#simulateur" className="inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-4 hover:underline">
                {L({ fr: "Quel montant ?", en: "How much?" })} <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </a>
            </div>
          </Wrap>
        </section>

        {/* La vidéo déborde de l'en-tête */}
        <Wrap className="relative -mt-40 sm:-mt-56 lg:-mt-72">
          <OtcVideo
            name="biz"
            label={{ fr: "Ooble pour les entreprises en vidéo", en: "Ooble for business, the video" }}
            className="animate-up mx-auto max-w-[980px] [animation-delay:300ms]"
          />
        </Wrap>

        {/* ===================== SÉLECTEUR D'USAGES ===================== */}
        <section>
          <Wrap className="pt-28 lg:pt-36">
            <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: CORAL }}>
                  {L({ fr: "Votre entreprise veut…", en: "Your business wants to…" })}
                </p>
                <div className="mt-6 flex flex-col items-start" role="tablist">
                  {USES.map((u, i) => (
                    <button
                      key={u.w.fr}
                      role="tab"
                      aria-selected={use === i}
                      onClick={() => { setUse(i); setPinned(true); }}
                      className={cn(
                        "font-display text-[3.4rem] font-semibold leading-[1.02] tracking-[-0.055em] transition-colors sm:text-[4.6rem]",
                        use === i ? "text-foreground" : "text-foreground/15 hover:text-foreground/40",
                      )}
                    >
                      {L(u.w)}
                      <span style={{ color: use === i ? CORAL : "transparent" }}>.</span>
                    </button>
                  ))}
                </div>
                <div key={use} className="animate-up mt-8 max-w-[440px]">
                  <p className="font-display text-[1.4rem] tracking-[-0.03em]">{L(U.t)}</p>
                  <p className="mt-2 text-[15px] leading-[1.7] text-muted-foreground">{L(U.d)}</p>
                </div>
              </div>
              <div
                className="relative mx-auto aspect-[4/3] w-full max-w-[560px] transition-colors duration-500"
                style={{ background: U.bg, borderRadius: "46% 54% 42% 58% / 55% 44% 56% 45%" }}
              >
                <div key={use} className="animate-up absolute inset-[12%]">{U.art()}</div>
              </div>
            </div>
          </Wrap>
        </section>

        {/* ===================== ÉTAPES AU DÉFILEMENT ===================== */}
        <section>
          <Wrap className="pt-28 lg:pt-36">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="lg:sticky lg:top-24 lg:h-[70vh] lg:self-start">
                <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: CORAL }}>
                  {L({ fr: "Ouvrir un compte entreprise", en: "Open a business account" })}
                </p>
                <div className="relative mt-4 hidden h-[320px] lg:block">
                  {STEPS.map((s, i) => (
                    <p
                      key={i}
                      aria-hidden
                      className="absolute left-0 top-0 font-display text-[19rem] font-semibold leading-[0.85] tracking-[-0.08em] transition-all duration-500"
                      style={{ color: s.c, opacity: step === i ? 1 : 0, transform: `translateY(${step === i ? 0 : step > i ? -40 : 40}px)` }}
                    >
                      {i + 1}
                    </p>
                  ))}
                </div>
                <p className="mt-4 font-display text-[2.2rem] leading-[1.05] tracking-[-0.045em] lg:hidden">
                  {L({ fr: "Quatre étapes, une seule fois.", en: "Four steps, done once." })}
                </p>
              </div>
              <div>
                {STEPS.map((s, i) => (
                  <div
                    key={s.t.fr}
                    ref={(el) => (stepRefs.current[i] = el)}
                    data-i={i}
                    className="flex min-h-0 flex-col justify-center py-8 lg:min-h-[44vh] lg:py-0"
                  >
                    <span className="font-display text-[3rem] font-semibold leading-none tracking-[-0.06em] lg:hidden" style={{ color: s.c }}>{i + 1}</span>
                    <h3 className={cn("mt-3 font-display text-[2rem] leading-[1.05] tracking-[-0.045em] transition-opacity duration-500 sm:text-[2.6rem]", step === i ? "lg:opacity-100" : "lg:opacity-25")}>
                      {L(s.t)}
                    </h3>
                    <p className={cn("mt-4 max-w-[440px] text-[16px] leading-[1.7] text-muted-foreground transition-opacity duration-500", step === i ? "lg:opacity-100" : "lg:opacity-25")}>
                      {L(s.d)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Wrap>
        </section>

        {/* ===================== VOTRE DOSSIER EST-IL PRÊT ? ===================== */}
        <section data-dark className="mt-24 lg:mt-32 bg-foreground text-background dark:bg-secondary dark:text-foreground">
          <Wrap className="py-20 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: SUN }}>
                  {L({ fr: "Avant de commencer", en: "Before you start" })}
                </p>
                <h2 className="mt-4 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[3.2rem]">
                  {L({ fr: "Votre dossier est-il prêt ?", en: "Is your file ready?" })}
                </h2>
                <p className="mt-5 max-w-[380px] text-[15px] leading-[1.7] opacity-70">
                  {L({ fr: "Cochez ce que vous avez sous la main. Quand tout est prêt, la vérification prend environ 5 minutes.", en: "Tick what you have at hand. When everything is ready, verification takes about 5 minutes." })}
                </p>
                <p className="mt-10 font-display text-[6rem] font-semibold leading-none tracking-[-0.07em] tabular-nums" style={{ color: pct === 100 ? SUN : undefined }}>
                  {pct}<span className="text-[3rem]">%</span>
                </p>
                <div className="mt-4 h-2 max-w-[360px] overflow-hidden rounded-full bg-background/15 dark:bg-foreground/15">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: SUN }} />
                </div>
                <p className="mt-4 text-[14px] opacity-70">
                  {pct === 100
                    ? L({ fr: "Tout est prêt. Vous pouvez ouvrir le compte.", en: "Everything's ready. You can open the account." })
                    : L({ fr: "Vos documents sont chiffrés et seule notre équipe conformité y a accès.", en: "Your documents are encrypted and only our compliance team can access them." })}
                </p>
                {pct === 100 && <Open light className="mt-6" />}
              </div>
              <div className="flex flex-col gap-9">
                {READY.map((g) => (
                  <div key={g.g.fr}>
                    <p className="text-[13px] font-semibold uppercase tracking-[0.14em] opacity-55">{L(g.g)}</p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {g.items.map((it) => {
                        const on = done.includes(it.fr);
                        return (
                          <button
                            key={it.fr}
                            type="button"
                            onClick={() => toggle(it.fr)}
                            aria-pressed={on}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-medium transition-all active:scale-[0.97]",
                              on ? "text-[#14110f]" : "bg-background/10 hover:bg-background/20 dark:bg-foreground/10 dark:hover:bg-foreground/20",
                            )}
                            style={on ? { background: SUN } : undefined}
                          >
                            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full transition-colors", on ? "bg-[#14110f]" : "bg-background/20 dark:bg-foreground/20")}>
                              {on && <Check className="h-3 w-3 text-[#ffc94d]" strokeWidth={3.2} />}
                            </span>
                            {L(it)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Wrap>
        </section>

        {/* ===================== SIMULATEUR DE MONTANT ===================== */}
        <section id="simulateur" className="scroll-mt-20">
          <Wrap className="pt-24 lg:pt-32">
            <div className="text-center">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: CORAL }}>
                {L({ fr: "Quel montant ?", en: "How much?" })}
              </p>
              <h2 className="mx-auto mt-4 max-w-[760px] font-display text-[2.2rem] leading-[1.05] tracking-[-0.045em] sm:text-[3rem]">
                {L({ fr: "Combien votre entreprise veut-elle échanger ?", en: "How much does your business want to trade?" })}
              </h2>
              <p className="mt-10 font-display text-[4rem] font-semibold leading-none tracking-[-0.065em] tabular-nums sm:text-[6.5rem]">
                {lang === "en" ? `$${nf(amount, lang)}` : `${nf(amount, lang)} $`}
              </p>
              <input
                type="range"
                min={0}
                max={STOPS.length - 1}
                step={1}
                value={stop}
                onChange={(e) => setStop(Number(e.target.value))}
                aria-label={L({ fr: "Montant à échanger", en: "Amount to trade" })}
                className="mx-auto mt-8 block w-full max-w-[640px] cursor-pointer accent-[hsl(var(--foreground))]"
              />
              <div key={inApp ? "app" : "otc"} className="animate-up mx-auto mt-10 max-w-[620px]">
                <p className="font-display text-[1.8rem] leading-[1.15] tracking-[-0.035em]">
                  {inApp
                    ? L({ fr: "Directement dans l'app.", en: "Right in the app." })
                    : L({ fr: "Passez par le desk OTC.", en: "Go through the OTC desk." })}
                </p>
                <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
                  {inApp
                    ? L({ fr: `Achats et ventes jusqu'à ${nf(TRADE_DAILY_MAX_CAD, "fr")} $ chacun sur 24 heures, par Interac.`, en: `Purchases and sales up to $${nf(TRADE_DAILY_MAX_CAD, "en")} each over 24 hours, by Interac.` })
                    : L({ fr: "Un prix ferme pour le montant entier, avec un seul interlocuteur.", en: "A firm price for the full amount, with one contact." })}
                </p>
                {inApp ? (
                  <Open className="mt-7" />
                ) : (
                  <Button asChild shape="rounded" size="lg" className="mt-7 px-7 font-semibold text-[#14110f] hover:opacity-90" style={{ background: SUN }}>
                    <Link to="/otc"><Handshake className="h-4 w-4" strokeWidth={1.8} />{L({ fr: "Découvrir le desk OTC", en: "Discover the OTC desk" })}</Link>
                  </Button>
                )}
              </div>
            </div>
          </Wrap>
        </section>

        {/* ===================== BANDEAU DES MÉTIERS ===================== */}
        <section className="mt-28 overflow-hidden py-6 lg:mt-36" style={{ background: SUN }}>
          <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
            {[...TRADES, ...TRADES].map((x, i) => (
              <span key={i} className="flex items-center gap-10 font-display text-[2rem] font-semibold tracking-[-0.04em] text-[#14110f] sm:text-[2.6rem]">
                {L(x)}
                <span className="h-3 w-3 rounded-full" style={{ background: i % 2 ? "#14110f" : CORAL }} />
              </span>
            ))}
          </div>
        </section>

        {/* ===================== APPEL FINAL ===================== */}
        <section>
          <Wrap className="pb-10 pt-24 text-center lg:pt-32">
            <Reveal>
              <h2 className="mx-auto max-w-[900px] font-display text-[2.8rem] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[4.2rem] lg:text-[5.2rem]">
                {L({ fr: "Faites entrer votre entreprise ", en: "Bring your business " })}
                <span className="text-foreground/35">{L({ fr: "dans l'USDT.", en: "into USDT." })}</span>
              </h2>
            </Reveal>
            <Reveal delay={140} className="mt-10 flex flex-wrap justify-center gap-3">
              <Open />
              <Button asChild variant="secondary" shape="rounded" size="lg" className="px-7">
                <Link to="/contact">{L({ fr: "Nous écrire", en: "Contact us" })}</Link>
              </Button>
            </Reveal>
          </Wrap>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Entreprises;
