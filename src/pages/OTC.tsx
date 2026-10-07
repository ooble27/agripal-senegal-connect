import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Handshake, Mail } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import OtcQuoteArt from "@/components/OtcQuoteArt";
import { Button } from "@/components/ui/button";
import { NETWORKS } from "@/components/app/networks";
import { OOBLE_OTC_EMAIL, TRADE_DAILY_MAX_CAD } from "@/lib/config";
import { useOtcVisible } from "@/lib/otc";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* Desk OTC : achats et ventes de USDT au-delà de la limite de l'application
   (9 999 $ sur 24 heures). Même langage que l'accueil : héros centré avec
   illustration animée, chiffres clés, étapes, panneau inversé, FAQ, appel
   final. Les demandes arrivent dans la boîte otc@ooble.ca (Admin →
   Messagerie, pastille « OTC »).
   La page est publique. Le bouton « Demander un prix » (formulaire
   /app/otc) n'apparaît que pour l'équipe Ooble tant que OTC_ENABLED vaut
   false ; les autres écrivent à otc@ooble.ca. */

type Bi = { fr: string; en: string };

const Wrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto max-w-[1200px] px-6 sm:px-10 ${className}`}>{children}</div>
);

const Kicker = ({ children, inverted }: { children: React.ReactNode; inverted?: boolean }) => (
  <p className={cn("text-[12px] uppercase tracking-[0.16em]", inverted ? "text-background/55" : "text-muted-foreground")}>
    {children}
  </p>
);

const H2 = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={cn("font-display text-[2.1rem] leading-[1.04] tracking-[-0.045em] sm:text-[2.9rem] lg:text-[3.5rem]", className)}>
    {children}
  </h2>
);

const Soft = ({ children }: { children: React.ReactNode }) => <span className="text-foreground/35">{children}</span>;

const STATS: { v: Bi; k: Bi }[] = [
  { v: { fr: "10 000 $", en: "$10,000" }, k: { fr: "Montant minimum, en achat comme en vente", en: "Minimum amount, to buy or to sell" } },
  { v: { fr: "1 jour", en: "1 day" }, k: { fr: "Ouvrable, au plus, pour vous répondre", en: "Business day, at most, to reply" } },
  { v: { fr: "0 $", en: "$0" }, k: { fr: "De frais ajoutés au prix annoncé", en: "In fees added to the quoted price" } },
  { v: { fr: "6", en: "6" }, k: { fr: "Réseaux, les mêmes que dans l'app", en: "Networks, the same as in the app" } },
];

const ESSENTIALS: { t: Bi; d: Bi }[] = [
  {
    t: { fr: "Un prix ferme", en: "A firm price" },
    d: {
      fr: "Un taux tout compris, garanti pendant la durée indiquée. Vous l'acceptez ou non, sans engagement.",
      en: "An all-in rate, guaranteed for the time stated. Accept it or not, with no commitment.",
    },
  },
  {
    t: { fr: "Un seul interlocuteur", en: "One contact" },
    d: {
      fr: "Un membre de l'équipe Ooble suit votre opération de la demande jusqu'au reçu.",
      en: "A member of the Ooble team follows your trade from request to receipt.",
    },
  },
  {
    t: { fr: "En une seule fois", en: "In one go" },
    d: {
      fr: `Au-delà de ${TRADE_DAILY_MAX_CAD.toLocaleString("fr-CA")} $ sur 24 heures, plus besoin de découper : le desk traite le montant entier.`,
      en: `Above $${TRADE_DAILY_MAX_CAD.toLocaleString("en-CA")} over 24 hours, no need to split: the desk handles the full amount.`,
    },
  },
  {
    t: { fr: "Particuliers et entreprises", en: "Individuals and businesses" },
    d: {
      fr: "Trésorerie d'entreprise, paiements fournisseurs, épargne : un dossier vérifié suffit.",
      en: "Business treasury, supplier payments, savings: one verified file is enough.",
    },
  },
];

const STEPS: { t: Bi; d: Bi }[] = [
  {
    t: { fr: "Vous écrivez au desk", en: "You write to the desk" },
    d: { fr: "Achat ou vente, montant, réseau. Un membre du desk vous répond personnellement.", en: "Buy or sell, amount, network. A member of the desk replies to you personally." },
  },
  {
    t: { fr: "Nous vérifions le dossier", en: "We review your file" },
    d: { fr: "Identité ou entreprise, et origine des fonds. Compte déjà vérifié : il ne reste en général qu'un justificatif.", en: "Identity or business, and source of funds. Already verified: usually only one document is left." },
  },
  {
    t: { fr: "Vous recevez un prix ferme", en: "You get a firm price" },
    d: { fr: "Un taux tout compris, valable pendant la durée indiquée dans la cotation.", en: "An all-in rate, valid for the time stated in the quote." },
  },
  {
    t: { fr: "Règlement", en: "Settlement" },
    d: { fr: "Achat : virement bancaire, puis les USDT à votre adresse. Vente : vos USDT, puis le virement sur votre compte.", en: "Buy: bank transfer, then the USDT to your address. Sell: your USDT, then the wire to your account." },
  },
  {
    t: { fr: "Confirmation", en: "Confirmation" },
    d: { fr: "Un reçu détaillé par courriel : montants, taux, transaction sur la blockchain.", en: "A detailed receipt by email: amounts, rate, blockchain transaction." },
  },
];

const NEEDS: Bi[] = [
  { fr: "Un compte Ooble vérifié", en: "A verified Ooble account" },
  { fr: "Un justificatif de l'origine des fonds", en: "Proof of the source of funds" },
  { fr: "Achat : votre adresse USDT et le réseau", en: "Buy: your USDT address and network" },
  { fr: "Vente : un compte bancaire canadien à votre nom", en: "Sell: a Canadian bank account in your name" },
];

const FAQ: { q: Bi; a: Bi }[] = [
  {
    q: { fr: "Pourquoi passer par le desk plutôt que par l'app ?", en: "Why use the desk instead of the app?" },
    a: {
      fr: `Dans l'application, achats et ventes sont limités à ${TRADE_DAILY_MAX_CAD.toLocaleString("fr-CA")} $ sur 24 heures. Au-delà, le desk traite votre opération en une fois, avec un prix ferme.`,
      en: `In the app, purchases and sales are limited to $${TRADE_DAILY_MAX_CAD.toLocaleString("en-CA")} over 24 hours. Above that, the desk handles your trade in one go, at a firm price.`,
    },
  },
  {
    q: { fr: "Le prix peut-il changer ?", en: "Can the price change?" },
    a: {
      fr: "Non, pas pendant la durée de validité indiquée dans la cotation. Passé ce délai, nous vous proposons un nouveau prix.",
      en: "No, not during the validity period stated in the quote. After that, we send you a new price.",
    },
  },
  {
    q: { fr: "Comment se fait le paiement ?", en: "How is payment made?" },
    a: {
      fr: "Par virement bancaire, depuis ou vers un compte canadien à votre nom. Interac n'est pas utilisé à ces montants.",
      en: "By bank transfer, from or to a Canadian account in your name. Interac isn't used at these amounts.",
    },
  },
  {
    q: { fr: "Pourquoi demander l'origine des fonds ?", en: "Why ask for the source of funds?" },
    a: {
      fr: "Comme toute entreprise de services monétaires au Canada, nous vérifions l'identité de nos clients et l'origine des fonds, et déclarons à CANAFE les opérations prévues par la loi.",
      en: "Like every money services business in Canada, we verify our clients' identity and the source of funds, and report to FINTRAC the transactions required by law.",
    },
  },
];

const OTC = () => {
  const [lang] = useLang();
  const L = (b: Bi) => b[lang];
  const canRequest = useOtcVisible();
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const mailto = `mailto:${OOBLE_OTC_EMAIL}`;

  /** Appel principal : formulaire pour l'équipe, courriel pour les autres. */
  const Primary = ({ size = "lg" }: { size?: "lg" | "default" }) =>
    canRequest ? (
      <Button asChild variant="appSolid" shape="rounded" size={size} className="px-7">
        <Link to="/app/otc">
          <Handshake className="h-4 w-4" strokeWidth={1.8} />
          {L({ fr: "Demander un prix", en: "Request a quote" })}
        </Link>
      </Button>
    ) : (
      <Button asChild variant="appSolid" shape="rounded" size={size} className="px-7">
        <a href={mailto}>
          <Mail className="h-4 w-4" strokeWidth={1.8} />
          {L({ fr: "Écrire au desk", en: "Write to the desk" })}
        </a>
      </Button>
    );

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main>
        {/* ===================== HÉROS ===================== */}
        <section>
          <Wrap className="flex flex-col justify-center pb-10 pt-20 text-center lg:pt-24">
            <p className="animate-up text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              {L({ fr: "Desk OTC · Gros volumes", en: "OTC desk · Large volumes" })}
            </p>
            <h1 className="animate-up mx-auto mt-6 max-w-[1000px] font-display text-[2.6rem] leading-[0.98] tracking-[-0.05em] [animation-delay:80ms] sm:text-[4rem] lg:text-[5.75rem]">
              {L({ fr: "Gros volumes,", en: "Large volumes," })}
              <br />
              <Soft>{L({ fr: "un prix ferme.", en: "one firm price." })}</Soft>
            </h1>
            <p className="animate-up mx-auto mt-8 max-w-[520px] text-[14px] leading-[1.65] text-muted-foreground [animation-delay:160ms] sm:text-[15px]">
              {L({
                fr: "À partir de 10 000 $, un membre de l'équipe Ooble vous donne un prix ferme et suit votre achat ou votre vente de USDT du début à la fin.",
                en: "From $10,000, a member of the Ooble team gives you a firm price and handles your USDT purchase or sale from start to finish.",
              })}
            </p>
            <div className="animate-up mt-10 flex flex-wrap justify-center gap-3 [animation-delay:260ms]">
              <Primary />
              <Button asChild variant="secondary" shape="rounded" size="lg" className="px-7">
                <a href="#comment">{L({ fr: "Comment ça marche", en: "How it works" })}</a>
              </Button>
            </div>

            <OtcQuoteArt className="animate-up mx-auto mt-6 max-w-[560px] [animation-delay:380ms] sm:mt-8" />
          </Wrap>
        </section>

        {/* ===================== CHIFFRES ===================== */}
        <section>
          <Wrap>
            <div className="grid grid-cols-2 gap-x-6 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <Reveal key={s.k.fr} delay={i * 80} className="border-t py-7">
                  <p className="font-display text-[2.4rem] leading-none tracking-[-0.05em] sm:text-[3rem]">{L(s.v)}</p>
                  <p className="mt-3 max-w-[220px] text-[14px] leading-[1.55] text-muted-foreground">{L(s.k)}</p>
                </Reveal>
              ))}
            </div>
          </Wrap>
        </section>

        {/* ===================== L'ESSENTIEL ===================== */}
        <section>
          <Wrap className="pt-24 lg:pt-28">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-20">
              <Reveal>
                <Kicker>{L({ fr: "Pourquoi le desk", en: "Why the desk" })}</Kicker>
                <H2 className="mt-4">
                  {L({ fr: "Un montant important", en: "A large amount" })}
                  <br />
                  {L({ fr: "mérite mieux", en: "deserves better" })}
                  <br />
                  <Soft>{L({ fr: "qu'un formulaire.", en: "than a form." })}</Soft>
                </H2>
              </Reveal>

              <div>
                {ESSENTIALS.map((e, i) => (
                  <Reveal key={e.t.fr} delay={i * 90}>
                    <div className={cn("border-t py-6", i === ESSENTIALS.length - 1 && "border-b")}>
                      <p className="font-display text-[20px] tracking-[-0.02em]">{L(e.t)}</p>
                      <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">{L(e.d)}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Wrap>
        </section>

        {/* ===================== COMMENT ÇA MARCHE ===================== */}
        <section id="comment" className="scroll-mt-24">
          <Wrap className="pt-24 lg:pt-28">
            <Reveal>
              <div className="mb-4 flex flex-col justify-between gap-6 sm:flex-row sm:items-end sm:gap-12">
                <div>
                  <Kicker>{L({ fr: "Comment ça marche", en: "How it works" })}</Kicker>
                  <H2 className="mt-4">{L({ fr: "Cinq étapes, un interlocuteur.", en: "Five steps, one contact." })}</H2>
                </div>
                <p className="max-w-[300px] text-[15px] leading-[1.6] text-muted-foreground">
                  {L({ fr: "Vous voyez le prix avant de vous engager. Rien ne bouge sans votre accord.", en: "You see the price before you commit. Nothing moves without your approval." })}
                </p>
              </div>
            </Reveal>

            {STEPS.map((s, i) => (
              <Reveal key={s.t.fr} delay={i * 100}>
                <div
                  className={cn(
                    "grid items-baseline gap-x-12 gap-y-3 border-t py-8 sm:grid-cols-[96px_1fr] lg:grid-cols-[96px_1fr_1fr]",
                    i === STEPS.length - 1 && "border-b",
                  )}
                >
                  <p className="font-display text-[2rem] leading-none tracking-[-0.045em] text-foreground/25 lg:text-[2.875rem]">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-display text-[1.35rem] tracking-[-0.03em] sm:text-[1.625rem]">{L(s.t)}</h3>
                  <p className="text-[15px] leading-[1.7] text-muted-foreground sm:col-start-2 lg:col-start-3 lg:row-start-1">{L(s.d)}</p>
                </div>
              </Reveal>
            ))}
          </Wrap>
        </section>

        {/* ===================== À PRÉPARER (panneau inversé) ===================== */}
        <section data-dark className="mt-24 bg-foreground py-20 text-background lg:mt-28 lg:py-24">
          <Wrap className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-20">
            <Reveal>
              <Kicker inverted>{L({ fr: "Avant de commencer", en: "Before you start" })}</Kicker>
              <h2 className="mt-5 font-display text-[2.1rem] leading-[1.04] tracking-[-0.045em] text-background sm:text-[2.9rem] lg:text-[3.5rem]">
                {L({ fr: "Un dossier clair,", en: "A clear file," })}
                <br />
                <span className="text-background/50">{L({ fr: "une réponse rapide.", en: "a quick answer." })}</span>
              </h2>
              <p className="mt-7 max-w-[420px] text-[16px] leading-[1.7] text-background/65">
                {L({
                  fr: "Comme toute entreprise de services monétaires au Canada, nous vérifions l'identité et l'origine des fonds, et déclarons à CANAFE les opérations prévues par la loi.",
                  en: "Like every money services business in Canada, we verify identity and the source of funds, and report to FINTRAC the transactions required by law.",
                })}
              </p>
            </Reveal>

            <ul>
              {NEEDS.map((n, i) => (
                <Reveal
                  key={n.fr}
                  delay={i * 80}
                  className={cn("flex items-center gap-4 border-t border-background/15 py-5 text-[17px]", i === NEEDS.length - 1 && "border-b border-background/15")}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/10">
                    <Check className="h-3.5 w-3.5 text-background/80" strokeWidth={2.4} />
                  </span>
                  {L(n)}
                </Reveal>
              ))}
            </ul>
          </Wrap>
        </section>

        {/* ===================== RÉSEAUX ===================== */}
        <section>
          <Wrap className="pt-24 lg:pt-28">
            <Reveal className="flex flex-col items-center text-center">
              <Kicker>{L({ fr: "Les mêmes réseaux que l'app", en: "The same networks as the app" })}</Kicker>
              <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-5 sm:gap-x-12">
                {NETWORKS.map((n) => (
                  <div key={n.id} className="flex items-center gap-3">
                    <img src={`/coins/${n.id}.svg`} alt="" draggable={false} className="h-[30px] w-[30px] rounded-full" />
                    <span className="font-display text-[18px] tracking-[-0.02em]">{n.name}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </Wrap>
        </section>

        {/* ===================== FAQ ===================== */}
        <section>
          <Wrap className="pt-24 lg:pt-28">
            <Reveal>
              <Kicker>{L({ fr: "Questions", en: "Questions" })}</Kicker>
              <H2 className="mb-10 mt-4">{L({ fr: "Ce qu'on nous demande.", en: "What people ask us." })}</H2>
            </Reveal>

            {FAQ.map((item, i) => {
              const open = faqOpen === i;
              return (
                <Reveal key={item.q.fr} delay={i * 60} className="border-t">
                  <button
                    onClick={() => setFaqOpen(open ? null : i)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="font-display text-[17px] tracking-[-0.02em] sm:text-[20px]">{L(item.q)}</span>
                    <span className={cn("shrink-0 text-[22px] leading-none text-foreground/35 transition-transform", open && "rotate-45")} aria-hidden>
                      +
                    </span>
                  </button>
                  {open && <p className="mb-7 max-w-[680px] text-[15px] leading-[1.7] text-muted-foreground">{L(item.a)}</p>}
                </Reveal>
              );
            })}
            <div className="border-t" />
          </Wrap>
        </section>

        {/* ===================== APPEL FINAL ===================== */}
        <section>
          <Wrap className="pb-8 pt-28 text-center lg:pt-32">
            <Reveal>
              <h2 className="mx-auto max-w-[820px] text-balance font-display text-[2.6rem] leading-[0.98] tracking-[-0.05em] sm:text-[3.6rem] lg:text-[5rem]">
                {L({ fr: "Parlons de", en: "Let's talk about" })}
                <br />
                <Soft>{L({ fr: "votre opération.", en: "your trade." })}</Soft>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <a href={mailto} className="mt-8 inline-flex items-center gap-2 font-display text-[1.4rem] tracking-[-0.03em] underline-offset-4 hover:underline sm:text-[1.75rem]">
                {OOBLE_OTC_EMAIL} <ArrowRight className="h-5 w-5" strokeWidth={1.8} />
              </a>
            </Reveal>
            <Reveal delay={200} className="mt-8 flex flex-wrap justify-center gap-3">
              <Primary />
              <Button asChild variant="secondary" shape="rounded" size="lg" className="px-7">
                <Link to="/faq">{L({ fr: "Toutes les questions", en: "All questions" })}</Link>
              </Button>
            </Reveal>
          </Wrap>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OTC;
